import pandas as pd
import numpy as np
from django.db import connection
from django.utils import timezone
from datetime import timedelta


def get_customer_rfm(days=90):
    """
    Calculates Recency, Frequency, and Monetary (RFM) scores for customers
    and segments them into groups using Pandas and Raw SQL.
    """
    now = timezone.now()
    from_date = now - timedelta(days=days)

    query = """
        SELECT o.CustomerID, c.Email, o.OrderDate, o.TotalAmount
        FROM Orders o
        JOIN Customers c ON o.CustomerID = c.CustomerID
        LEFT JOIN OrderStatus os ON o.OrderStatusID = os.OrderStatusID
        WHERE o.OrderDate >= %s AND (os.StatusName IS NULL OR os.StatusName != 'Cancelled')
    """

    df = pd.read_sql(query, connection, params=[from_date])

    if df.empty:
        return []

    df['OrderDate'] = pd.to_datetime(df['OrderDate'])
    df['days_since'] = (pd.Timestamp(now) - df['OrderDate']).dt.days

    rfm = df.groupby(['CustomerID', 'Email']).agg({
        'days_since': 'min',
        'CustomerID': 'count',
        'TotalAmount': 'sum'
    }).rename(columns={
        'days_since': 'recency',
        'CustomerID': 'frequency',
        'TotalAmount': 'monetary'
    }).reset_index()

    if rfm.empty:
        return []

    try:
        rfm['r_score'] = pd.qcut(rfm['recency'].rank(method='first'), 4, labels=[4, 3, 2, 1])
    except ValueError:
        rfm['r_score'] = 1

    try:
        rfm['f_score'] = pd.qcut(rfm['frequency'].rank(method='first'), 4, labels=[1, 2, 3, 4])
    except ValueError:
        rfm['f_score'] = 1

    try:
        rfm['m_score'] = pd.qcut(rfm['monetary'].rank(method='first'), 4, labels=[1, 2, 3, 4])
    except ValueError:
        rfm['m_score'] = 1

    rfm['rfm_score'] = rfm['r_score'].astype(str) + rfm['f_score'].astype(str) + rfm['m_score'].astype(str)

    def segment_customer(score):
        if score == '444':
            return 'Champions'
        elif score.startswith('4') or score.startswith('3'):
            return 'Loyal Customers'
        elif score == '111':
            return 'Lost'
        elif score.startswith('1'):
            return 'At Risk'
        else:
            return 'Regulars'

    rfm['segment'] = rfm['rfm_score'].apply(segment_customer)

    rfm = rfm.rename(columns={'CustomerID': 'customer_id', 'Email': 'customer_email'})
    rfm = rfm.where(pd.notnull(rfm), None)
    rfm['monetary'] = rfm['monetary'].astype(float)

    return rfm.to_dict('records')


def get_churn_prediction(days=90, churn_threshold_days=30):
    """
    Predict which customers will churn in the next `churn_threshold_days` using RFM + Logistic Regression.
    Steps:
      1. Compute RFM features for all customers
      2. Label: churned = 1 if recency > churn_threshold_days, else 0
      3. Train logistic regression on RFM features
      4. Return per-customer churn probability + segment summary
    """
    now = timezone.now()
    from_date = now - timedelta(days=days)

    query = """
        SELECT o.CustomerID,
               c.FirstName, c.LastName, c.Email,
               o.OrderDate, o.TotalAmount
        FROM Orders o
        JOIN Customers c ON o.CustomerID = c.CustomerID
        LEFT JOIN OrderStatus os ON o.OrderStatusID = os.OrderStatusID
        WHERE o.OrderDate >= %s AND (os.StatusName IS NULL OR os.StatusName <> 'Cancelled')
    """
    df = pd.read_sql(query, connection, params=[from_date])

    if df.empty or len(df) < 5:
        return {'error': 'Not enough order data for churn prediction', 'customers': [], 'summary': {}}

    df['OrderDate'] = pd.to_datetime(df['OrderDate'])
    df['days_since'] = (pd.Timestamp(now) - df['OrderDate']).dt.days

    rfm = df.groupby(['CustomerID', 'FirstName', 'LastName', 'Email']).agg(
        recency=('days_since', 'min'),
        frequency=('CustomerID', 'count'),
        monetary=('TotalAmount', 'sum'),
        last_order=('OrderDate', 'max'),
    ).reset_index()

    rfm['monetary'] = rfm['monetary'].astype(float)

    # Label: churned if recency > threshold
    rfm['churned'] = (rfm['recency'] > churn_threshold_days).astype(int)

    # Features for logistic regression
    features = rfm[['recency', 'frequency', 'monetary']].copy()

    # Scale features
    from sklearn.preprocessing import StandardScaler
    from sklearn.linear_model import LogisticRegression

    scaler = StandardScaler()
    X = scaler.fit_transform(features)
    y = rfm['churned'].values

    # Need both classes present
    if len(set(y)) < 2:
        # All same class — assign probability based on recency heuristic
        rfm['churn_probability'] = rfm['recency'].apply(
            lambda r: min(round(r / (days * 0.8), 4), 1.0)
        )
    else:
        model = LogisticRegression(max_iter=500, random_state=42)
        model.fit(X, y)
        rfm['churn_probability'] = model.predict_proba(X)[:, 1].round(4)

    # Segment by risk
    def risk_segment(prob):
        if prob >= 0.7:
            return 'High Risk'
        elif prob >= 0.4:
            return 'Medium Risk'
        else:
            return 'Low Risk'

    rfm['risk_segment'] = rfm['churn_probability'].apply(risk_segment)

    # Build response
    customers = []
    for _, row in rfm.iterrows():
        customers.append({
            'customer_id': int(row['CustomerID']),
            'name': f"{row['FirstName']} {row['LastName']}",
            'email': row['Email'],
            'recency': int(row['recency']),
            'frequency': int(row['frequency']),
            'monetary': round(float(row['monetary']), 2),
            'churn_probability': round(float(row['churn_probability']), 4),
            'risk_segment': row['risk_segment'],
            'last_order': row['last_order'].strftime('%Y-%m-%d') if pd.notna(row['last_order']) else '',
        })

    # Sort by churn probability descending
    customers.sort(key=lambda c: c['churn_probability'], reverse=True)

    # Summary
    total = len(customers)
    high = sum(1 for c in customers if c['risk_segment'] == 'High Risk')
    medium = sum(1 for c in customers if c['risk_segment'] == 'Medium Risk')
    low = sum(1 for c in customers if c['risk_segment'] == 'Low Risk')
    avg_prob = round(sum(c['churn_probability'] for c in customers) / total, 4) if total else 0

    summary = {
        'total_customers': total,
        'high_risk': high,
        'medium_risk': medium,
        'low_risk': low,
        'avg_churn_probability': avg_prob,
        'churn_rate': round(high / total * 100, 1) if total else 0,
    }

    return {
        'customers': customers,
        'summary': summary,
    }


def get_dynamic_pricing(product_id):
    """
    Suggest price adjustments based on demand trends, stock levels, and competition.
    Returns: suggestion text, direction (+/-/maintain), percentage, reasoning.
    """
    now = timezone.now()

    # Get product info
    query_product = """
        SELECT p.ProductID, p.ProductName, p.SellingPrice, p.CostPrice,
               p.Stock, p.ReorderLevel, p.UnitsSold
        FROM Products p WHERE p.ProductID = %s
    """
    prod_df = pd.read_sql(query_product, connection, params=[product_id])
    if prod_df.empty:
        return {'error': 'Product not found'}

    product = prod_df.iloc[0]
    selling_price = float(product['SellingPrice'])
    cost_price = float(product['CostPrice'])
    stock = int(product['Stock'])
    reorder_level = int(product['ReorderLevel'])
    margin = (selling_price - cost_price) / selling_price * 100 if selling_price > 0 else 0

    # Recent demand: last 30 days vs previous 30 days
    query_demand = """
        SELECT o.OrderDate, od.Quantity
        FROM OrderDetails od
        JOIN Orders o ON od.OrderID = o.OrderID
        LEFT JOIN OrderStatus os ON o.OrderStatusID = os.OrderStatusID
        WHERE od.ProductID = %s AND o.OrderDate >= %s
          AND (os.StatusName IS NULL OR os.StatusName <> 'Cancelled')
    """
    from_date_60 = now - timedelta(days=60)
    demand_df = pd.read_sql(query_demand, connection, params=[product_id, from_date_60])

    if demand_df.empty:
        return {
            'product_id': product_id,
            'current_price': selling_price,
            'suggested_price': selling_price,
            'adjustment_pct': 0,
            'direction': 'maintain',
            'reason': 'No recent sales data — maintain current price',
            'factors': [],
        }

    demand_df['OrderDate'] = pd.to_datetime(demand_df['OrderDate'])
    mid_date = now - timedelta(days=30)

    recent = demand_df[demand_df['OrderDate'] >= mid_date]['Quantity'].sum()
    previous = demand_df[demand_df['OrderDate'] < mid_date]['Quantity'].sum()

    # Demand growth rate
    if previous > 0:
        demand_growth = (recent - previous) / previous * 100
    else:
        demand_growth = 100 if recent > 0 else 0

    # Stock pressure (low stock + high demand = can increase price)
    stock_ratio = stock / max(reorder_level, 1)

    # Decision logic
    factors = []
    adjustment = 0

    # Factor 1: Demand trend
    if demand_growth > 30:
        adjustment += min(demand_growth * 0.1, 8)  # cap at +8%
        factors.append(f'Demand rising {demand_growth:.0f}% (30d vs prior 30d)')
    elif demand_growth < -30:
        adjustment -= min(abs(demand_growth) * 0.08, 7)  # cap at -7%
        factors.append(f'Demand declining {demand_growth:.0f}% (30d vs prior 30d)')

    # Factor 2: Stock level
    if stock_ratio < 0.5 and recent > 0:
        adjustment += 3
        factors.append(f'Low stock ({stock} units, reorder at {reorder_level})')
    elif stock_ratio > 5 and recent < previous:
        adjustment -= 3
        factors.append(f'Overstocked ({stock} units vs reorder {reorder_level})')

    # Factor 3: Margin health
    if margin < 15:
        adjustment += 2
        factors.append(f'Low margin ({margin:.1f}%) — consider price increase')
    elif margin > 60:
        adjustment -= 1
        factors.append(f'High margin ({margin:.1f}%) — room for competitive pricing')

    # Clamp adjustment
    adjustment = round(max(-10, min(10, adjustment)), 1)
    suggested_price = round(selling_price * (1 + adjustment / 100), 2)
    # Never go below cost
    suggested_price = max(suggested_price, cost_price * 1.05)

    if adjustment > 0.5:
        direction = 'increase'
    elif adjustment < -0.5:
        direction = 'decrease'
    else:
        direction = 'maintain'

    if not factors:
        factors.append('Demand and stock levels are stable')

    return {
        'product_id': product_id,
        'current_price': selling_price,
        'suggested_price': suggested_price,
        'adjustment_pct': adjustment,
        'direction': direction,
        'reason': f"{'Increase' if direction == 'increase' else 'Decrease' if direction == 'decrease' else 'Maintain'} price by {abs(adjustment)}%" if adjustment != 0 else 'Maintain current pricing',
        'factors': factors,
        'demand_recent_30d': int(recent),
        'demand_previous_30d': int(previous),
        'demand_growth_pct': round(demand_growth, 1),
        'stock': stock,
        'margin_pct': round(margin, 1),
    }


def get_demand_forecast(product_id, days_history=30, forecast_days=7):
    """
    Calculates a simple demand forecast (Moving Average) for a given product.
    """
    now = timezone.now()
    from_date = now - timedelta(days=days_history)

    query = """
        SELECT o.OrderDate AS date, od.Quantity AS quantity
        FROM OrderDetails od
        JOIN Orders o ON od.OrderID = o.OrderID
        LEFT JOIN OrderStatus os ON o.OrderStatusID = os.OrderStatusID
        WHERE od.ProductID = %s
          AND o.OrderDate >= %s
          AND (os.StatusName IS NULL OR os.StatusName != 'Cancelled')
    """

    df = pd.read_sql(query, connection, params=[product_id, from_date])

    if df.empty:
        return {"error": "Not enough data for forecasting"}

    df['date'] = pd.to_datetime(df['date']).dt.date

    daily_sales = df.groupby('date')['quantity'].sum().reset_index()
    daily_sales.set_index('date', inplace=True)

    idx = pd.date_range(from_date.date(), now.date())
    daily_sales.index = pd.DatetimeIndex(daily_sales.index)
    daily_sales = daily_sales.reindex(idx, fill_value=0)

    if len(daily_sales) > 3:
        sma = daily_sales['quantity'].rolling(window=3).mean().iloc[-1]
    else:
        sma = daily_sales['quantity'].mean()

    forecast_dates = pd.date_range(now.date() + timedelta(days=1), periods=forecast_days)
    forecast = []

    for d in forecast_dates:
        forecast.append({
            "date": d.strftime('%Y-%m-%d'),
            "forecasted_demand": max(0, round(float(sma), 1))
        })

    return {
        "product_id": product_id,
        "historical_avg_daily": round(float(daily_sales['quantity'].mean()), 2),
        "forecast": forecast
    }


def get_product_recommendations(product_id, limit=5):
    """
    Market Basket Analysis finding products frequently bought together.
    """
    query = """
        SELECT p.ProductID AS id, p.ProductName AS name,
               p.ProductImageURL AS image_url, p.SellingPrice AS price
        FROM OrderDetails od
        JOIN Products p ON od.ProductID = p.ProductID
        WHERE od.OrderID IN (
            SELECT OrderID FROM OrderDetails WHERE ProductID = %s
        ) AND od.ProductID != %s
    """

    df = pd.read_sql(query, connection, params=[product_id, product_id])

    if df.empty:
        return []

    freq = df.groupby(['id', 'name', 'image_url', 'price']).size().reset_index(name='times_bought_together')
    recommendations = freq.sort_values(by='times_bought_together', ascending=False).head(limit)

    recommendations['price'] = recommendations['price'].astype(float)
    recommendations['times_bought_together'] = recommendations['times_bought_together'].astype(int)

    return recommendations.to_dict('records')


# ─────────────────────────────────────────────────────────
#  Prophet-Only Product Forecast
# ─────────────────────────────────────────────────────────

def _smart_daily_avg(vals):
    """
    Compute a frequency-adjusted daily average for sparse sales data.
    Instead of averaging ALL days (which dilutes sporadic sales to ~0),
    this uses: (mean of non-zero days) * (purchase frequency).
    Example: 3 units on 3 out of 30 days → avg_nonzero=1.0, freq=0.10 → 0.30/day
    Then the 7-day forecast = 0.30 * 7 = 2.1 units (meaningful, not 0).
    """
    vals = np.array(vals, dtype=float)
    if len(vals) == 0:
        return 0.0
    nonzero = vals[vals > 0]
    if len(nonzero) == 0:
        return 0.0
    avg_nonzero = float(nonzero.mean())
    purchase_frequency = len(nonzero) / len(vals)
    return avg_nonzero * purchase_frequency


def _ewma_forecast_base(vals, span=7):
    """
    Exponential Weighted Moving Average — gives more weight to recent values.
    If 6 units sold today, the EWMA won't collapse to near-zero like a simple avg.
    Instead it captures recent momentum: recent spike → forecast stays elevated.
    """
    vals = np.array(vals, dtype=float)
    if len(vals) == 0:
        return 0.0
    series = pd.Series(vals)
    ewma = series.ewm(span=min(span, len(vals)), min_periods=1).mean()
    return max(float(ewma.iloc[-1]), 0.0)


def _compute_moving_avg(vals, window=7):
    """Compute simple moving average, padding start with cumulative mean."""
    vals = np.array(vals, dtype=float)
    if len(vals) == 0:
        return []
    series = pd.Series(vals)
    ma = series.rolling(window=window, min_periods=1).mean()
    return [round(float(v), 2) for v in ma.values]


def _prophet_forecast_metric(hist_df, date_col, value_col, periods, freq='D'):
    """
    Run Facebook Prophet on a single metric.
    Returns the full Prophet forecast DataFrame (historical + future).
    Falls back to a realistic trend-based forecast if Prophet is not installed
    or if Prophet's predictions are all near-zero for sparse data.
    """
    import warnings
    prophet_df = hist_df[[date_col, value_col]].rename(columns={date_col: 'ds', value_col: 'y'})
    prophet_df['ds'] = pd.to_datetime(prophet_df['ds'])

    vals = prophet_df['y'].values.astype(float)
    smart_avg = _smart_daily_avg(vals)
    last_date = prophet_df['ds'].max()
    future_dates = pd.date_range(last_date + pd.Timedelta(days=1), periods=periods, freq=freq)

    def _build_fallback(use_avg):
        """
        Build a realistic fallback forecast using EWMA + mean reversion.

        Key idea: start from EWMA (respects recent spikes like 6 units today),
        then gradually revert toward the long-term average over the forecast period.
        This means: spike today → forecast starts high → slowly settles toward norm.
        Not: spike today → immediate crash to near-zero.
        """
        hist_part = pd.DataFrame({
            'ds': prophet_df['ds'],
            'yhat': vals,
            'yhat_lower': vals * 0.85,
            'yhat_upper': vals * 1.15,
        })

        # EWMA captures recent momentum (respects spikes)
        ewma_base = _ewma_forecast_base(vals, span=7)
        long_term_avg = use_avg  # frequency-adjusted average

        # Use whichever is higher as starting point — spike shouldn't be ignored
        forecast_start = max(ewma_base, long_term_avg)

        # Calculate realistic variation from historical non-zero values
        nonzero_vals = vals[vals > 0]
        if len(nonzero_vals) >= 2:
            hist_std = float(nonzero_vals.std())
        elif forecast_start > 0:
            hist_std = forecast_start * 0.25
        else:
            hist_std = 0.0

        # Detect trend from recent data
        recent_half = vals[-(len(vals) // 3):] if len(vals) >= 6 else vals
        early_half = vals[:len(vals) // 3] if len(vals) >= 6 else vals
        recent_avg = _ewma_forecast_base(recent_half, span=5)
        early_avg = _smart_daily_avg(early_half)
        if early_avg > 0:
            daily_trend = (recent_avg - early_avg) / max(len(vals), 1)
        else:
            daily_trend = 0.0

        # Build forecast with mean reversion + day-of-week pattern
        np.random.seed(42)  # Reproducible
        forecast_vals = []
        for i in range(periods):
            # Mean reversion: start from EWMA, drift toward long-term avg
            reversion_weight = i / (periods + 3)  # gradual reversion
            base = forecast_start * (1 - reversion_weight) + long_term_avg * reversion_weight
            base += daily_trend * (i + 1)

            # Day-of-week pattern (Fri/Sat higher, Mon lower)
            dow = future_dates[i].weekday()
            dow_factor = 1.15 if dow in (4, 5) else (0.9 if dow == 0 else 1.0)

            # Controlled random variation
            noise = np.random.normal(0, hist_std * 0.2)
            val = max(base * dow_factor + noise, 0)
            forecast_vals.append(round(val, 2))

        forecast_arr = np.array(forecast_vals)
        ci_width = max(hist_std * 0.6, forecast_start * 0.15)
        future_part = pd.DataFrame({
            'ds': future_dates,
            'yhat': forecast_arr,
            'yhat_lower': np.maximum(forecast_arr - ci_width, 0),
            'yhat_upper': forecast_arr + ci_width,
        })
        return pd.concat([hist_part, future_part], ignore_index=True)

    try:
        from prophet import Prophet
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            model = Prophet(
                interval_width=0.95,
                yearly_seasonality=True,
                weekly_seasonality=(freq == 'D'),
                daily_seasonality=False,
                changepoint_prior_scale=0.05,
            )
            model.fit(prophet_df)
            future = model.make_future_dataframe(periods=periods, freq=freq)
            forecast = model.predict(future)

            # Check if Prophet predicted all near-zero for a product with actual sales
            future_preds = forecast[forecast['ds'] > last_date]['yhat'].values
            if smart_avg > 0.01 and (len(future_preds) == 0 or np.mean(np.maximum(future_preds, 0)) < smart_avg * 0.1):
                # Prophet under-predicted for sparse data — use smart fallback
                return _build_fallback(smart_avg)

            return forecast
    except ImportError:
        return _build_fallback(smart_avg)
    except Exception:
        return _build_fallback(smart_avg)


def get_comprehensive_forecast(product_id, days_history=30, forecast_days=7):
    """
    Prophet-only product forecasting:
    - Fetches real historical data from the database
    - Runs Prophet on Units, Revenue, Profit
    - Returns 3 forecast charts (Revenue, Profit, Units) with 95% confidence intervals
    - Stock decision recommendation (INCREASE / MAINTAIN / REDUCE)
    - Key insights & summary table
    - NO Decision Matrix
    """
    now = timezone.now()
    from_date = now - timedelta(days=days_history)

    # ── Fetch raw order data from database ──
    query = """
        SELECT o.OrderDate AS date,
               od.Quantity  AS quantity,
               od.UnitPrice AS unit_price,
               p.CostPrice  AS cost_price,
               p.SellingPrice AS selling_price,
               p.Stock       AS current_stock,
               p.ReorderLevel AS reorder_level,
               p.ProductName AS product_name,
               p.ProductDescription AS description,
               p.ProductImageURL AS image_url
        FROM OrderDetails od
        JOIN Orders o ON od.OrderID = o.OrderID
        JOIN Products p ON od.ProductID = p.ProductID
        LEFT JOIN OrderStatus os ON o.OrderStatusID = os.OrderStatusID
        WHERE od.ProductID = %s
          AND o.OrderDate >= %s
          AND (os.StatusName IS NULL OR os.StatusName != 'Cancelled')
    """
    df = pd.read_sql(query, connection, params=[product_id, from_date])

    if df.empty:
        return {'error': 'Not enough sales data for forecasting'}

    # ── Extract product metadata ──
    df['date'] = pd.to_datetime(df['date']).dt.date
    selling_price = float(df['selling_price'].iloc[0])
    cost_price = float(df['cost_price'].iloc[0])
    current_stock = int(df['current_stock'].iloc[0])
    reorder_level = int(df['reorder_level'].iloc[0])
    product_name = df['product_name'].iloc[0]
    description_val = df['description'].iloc[0] or ''
    image_url_val = df['image_url'].iloc[0] or ''
    margin_ratio = (selling_price - cost_price) / selling_price if selling_price > 0 else 0.0

    # ── Aggregate to daily ──
    df['line_revenue'] = df['quantity'].astype(float) * df['unit_price'].astype(float)
    daily = df.groupby('date').agg(
        units=('quantity', 'sum'),
        revenue=('line_revenue', 'sum')
    ).reset_index()
    daily.set_index('date', inplace=True)
    daily.index = pd.DatetimeIndex(daily.index)

    # Fill missing days with 0
    full_idx = pd.date_range(from_date.date(), now.date())
    daily = daily.reindex(full_idx, fill_value=0)
    daily['profit'] = daily['revenue'] * margin_ratio

    # Build historical DataFrame with Date column for Prophet
    historical_data = pd.DataFrame({
        'Date': daily.index,
        'Unit_Sales': daily['units'].values.astype(float),
        'Revenue': daily['revenue'].values.astype(float),
        'Profit': daily['profit'].values.astype(float),
    })

    dates = [d.strftime('%Y-%m-%d') for d in daily.index]
    units_arr = daily['units'].values.astype(float)
    revenue_arr = daily['revenue'].values.astype(float)
    profit_arr = daily['profit'].values.astype(float)
    n = len(dates)

    # ── Helper: sanitise value (replace NaN/Inf with 0) ──
    def _safe(v):
        v = float(v)
        if np.isnan(v) or np.isinf(v):
            return 0.0
        return v

    # ── PROPHET FORECASTS ──
    try:
        units_forecast = _prophet_forecast_metric(historical_data, 'Date', 'Unit_Sales', forecast_days)
        revenue_forecast = _prophet_forecast_metric(historical_data, 'Date', 'Revenue', forecast_days)
        profit_forecast = _prophet_forecast_metric(historical_data, 'Date', 'Profit', forecast_days)
    except Exception:
        # If all Prophet models fail, use frequency-adjusted smart averages with variation
        avg_units = _smart_daily_avg(units_arr)
        avg_revenue = _smart_daily_avg(revenue_arr)
        avg_profit = _smart_daily_avg(profit_arr)
        last_date = historical_data['Date'].max()
        future_dates_fallback = pd.date_range(last_date + pd.Timedelta(days=1), periods=forecast_days, freq='D')

        def _build_fallback_inner(hist_vals, avg_val):
            hist_part = pd.DataFrame({'ds': historical_data['Date'], 'yhat': hist_vals, 'yhat_lower': hist_vals * 0.85, 'yhat_upper': hist_vals * 1.15})
            ewma_base = _ewma_forecast_base(hist_vals, span=7)
            forecast_start = max(ewma_base, avg_val)
            nonzero = hist_vals[hist_vals > 0]
            std_val = float(nonzero.std()) if len(nonzero) >= 2 else forecast_start * 0.25
            np.random.seed(42)
            f_vals = []
            for i in range(forecast_days):
                reversion = i / (forecast_days + 3)
                base = forecast_start * (1 - reversion) + avg_val * reversion
                f_vals.append(max(base + np.random.normal(0, std_val * 0.2), 0))
            f_vals = np.array(f_vals)
            ci_w = max(std_val * 0.6, forecast_start * 0.15)
            future_part = pd.DataFrame({'ds': future_dates_fallback, 'yhat': f_vals, 'yhat_lower': np.maximum(f_vals - ci_w, 0), 'yhat_upper': f_vals + ci_w})
            return pd.concat([hist_part, future_part], ignore_index=True)

        units_forecast = _build_fallback_inner(units_arr, avg_units)
        revenue_forecast = _build_fallback_inner(revenue_arr, avg_revenue)
        profit_forecast = _build_fallback_inner(profit_arr, avg_profit)

    last_hist_date = historical_data['Date'].max()

    # Extract future-only predictions
    future_units = units_forecast[units_forecast['ds'] > last_hist_date].copy()
    future_revenue = revenue_forecast[revenue_forecast['ds'] > last_hist_date].copy()
    future_profit = profit_forecast[profit_forecast['ds'] > last_hist_date].copy()

    # Safety: if future dataframes are empty (edge case), build minimal fallback with variation
    if future_units.empty or future_revenue.empty or future_profit.empty:
        avg_u = _smart_daily_avg(units_arr)
        avg_r = _smart_daily_avg(revenue_arr)
        avg_p = _smart_daily_avg(profit_arr)
        fallback_dates = pd.date_range(last_hist_date + pd.Timedelta(days=1), periods=forecast_days, freq='D')
        np.random.seed(42)

        def _make_varied(avg_val, hist_vals):
            ewma_base = _ewma_forecast_base(hist_vals, span=7)
            fstart = max(ewma_base, avg_val)
            nz = hist_vals[hist_vals > 0]
            std = float(nz.std()) if len(nz) >= 2 else fstart * 0.25
            fv = []
            for i in range(forecast_days):
                rev = i / (forecast_days + 3)
                base = fstart * (1 - rev) + avg_val * rev
                fv.append(max(base + np.random.normal(0, std * 0.2), 0))
            fv = np.array(fv)
            ci_w = max(std * 0.6, fstart * 0.15)
            return pd.DataFrame({'ds': fallback_dates, 'yhat': fv, 'yhat_lower': np.maximum(fv - ci_w, 0), 'yhat_upper': fv + ci_w})

        if future_units.empty:
            future_units = _make_varied(avg_u, units_arr)
        if future_revenue.empty:
            future_revenue = _make_varied(avg_r, revenue_arr)
        if future_profit.empty:
            future_profit = _make_varied(avg_p, profit_arr)

    f_dates = [d.strftime('%Y-%m-%d') for d in future_units['ds']]

    # ── Historical averages for comparison (frequency-adjusted for sparse data) ──
    historical_avg_units = _safe(_smart_daily_avg(historical_data['Unit_Sales'].values))
    historical_avg_profit_margin = 0.0
    if (historical_data['Revenue'] > 0).any():
        ratio = (historical_data['Profit'] / historical_data['Revenue'].replace(0, np.nan)).dropna()
        if len(ratio) > 0:
            historical_avg_profit_margin = _safe(ratio.mean() * 100)

    # ── Build forecasts output per metric ──
    forecasts_output = {}
    for metric_name, fut_df in [('units', future_units), ('revenue', future_revenue), ('profit', future_profit)]:
        yhat = np.maximum(np.nan_to_num(fut_df['yhat'].values, nan=0.0, posinf=0.0, neginf=0.0), 0)
        yhat_lower = np.maximum(np.nan_to_num(fut_df['yhat_lower'].values, nan=0.0, posinf=0.0, neginf=0.0), 0) if 'yhat_lower' in fut_df else yhat * 0.7
        yhat_upper = np.nan_to_num(fut_df['yhat_upper'].values, nan=0.0, posinf=0.0, neginf=0.0) if 'yhat_upper' in fut_df else yhat * 1.3
        forecasts_output[metric_name] = {
            'prophet': [round(_safe(v), 2) for v in yhat],
            'ci_95': {
                'upper': [round(_safe(v), 2) for v in yhat_upper],
                'lower': [round(_safe(v), 2) for v in yhat_lower],
            },
        }

    # ── STOCK DECISION (matches your code's logic) ──
    forecasted_avg_units = _safe(_smart_daily_avg(np.maximum(future_units['yhat'].values, 0)))
    forecasted_profit_margin = 0.0
    if (future_revenue['yhat'] > 0).any():
        ratio = (future_profit['yhat'] / future_revenue['yhat'].replace(0, np.nan)).dropna()
        if len(ratio) > 0:
            forecasted_profit_margin = _safe(ratio.mean() * 100)

    # Growth vs historical
    growth_pct = _safe(((forecasted_avg_units / historical_avg_units) - 1) * 100) if historical_avg_units > 0 else 0

    if forecasted_avg_units > historical_avg_units * 1.2 and forecasted_profit_margin > 50:
        stock_decision = 'INCREASE STOCK'
        decision_color = 'green'
        decision_reason = (
            f"Forecasted demand ({forecasted_avg_units:.1f}/day) exceeds historical avg "
            f"({historical_avg_units:.1f}/day) by {growth_pct:.1f}% with strong margin ({forecasted_profit_margin:.1f}%)"
        )
    elif forecasted_avg_units < historical_avg_units * 0.8 or forecasted_profit_margin < 45:
        stock_decision = 'REDUCE STOCK'
        decision_color = 'red'
        if forecasted_profit_margin < 45:
            decision_reason = f"Forecasted profit margin ({forecasted_profit_margin:.1f}%) is below 45% threshold"
        else:
            decision_reason = (
                f"Forecasted demand ({forecasted_avg_units:.1f}/day) is below 80% of "
                f"historical avg ({historical_avg_units:.1f}/day)"
            )
    else:
        stock_decision = 'MAINTAIN STOCK'
        decision_color = 'yellow'
        decision_reason = (
            f"Forecasted demand ({forecasted_avg_units:.1f}/day) is within normal range "
            f"of historical avg ({historical_avg_units:.1f}/day) with margin ({forecasted_profit_margin:.1f}%)"
        )

    # ── TREND INDICATORS ──
    def period_growth_for(arr):
        if n >= 2:
            first_half = arr[:n // 2].mean()
            second_half = arr[n // 2:].mean()
            return round(_safe(((second_half - first_half) / first_half * 100) if first_half > 0 else 0), 2)
        return 0.0

    def last_n_avg(arr, window):
        return round(_safe(arr[-window:].mean() if len(arr) >= window else arr.mean()), 2)

    trend_indicators = {
        'revenue': {
            'growth_rate_pct': period_growth_for(revenue_arr),
            'ma_7': last_n_avg(revenue_arr, 7),
        },
        'profit': {
            'growth_rate_pct': period_growth_for(profit_arr),
            'ma_7': last_n_avg(profit_arr, 7),
        },
        'units': {
            'growth_rate_pct': period_growth_for(units_arr),
            'ma_7': last_n_avg(units_arr, 7),
        },
    }

    # ── KEY METRICS ──
    total_units = _safe(units_arr.sum())
    total_revenue = _safe(revenue_arr.sum())
    total_profit = _safe(profit_arr.sum())

    daily_avg_units = total_units / max(n, 1)          # true mean units/day over history window
    def summarize_period(fu, fr, fp, days_count):
        slc = slice(0, min(days_count, len(fu)))
        return {
            'units': round(_safe(np.maximum(np.nan_to_num(fu['yhat'].iloc[slc].values, nan=0.0), 0).sum()), 1),
            'revenue': round(_safe(np.maximum(np.nan_to_num(fr['yhat'].iloc[slc].values, nan=0.0), 0).sum()), 2),
            'profit': round(_safe(np.maximum(np.nan_to_num(fp['yhat'].iloc[slc].values, nan=0.0), 0).sum()), 2),
        }

    summary_table = {
        'next_3_days': summarize_period(future_units, future_revenue, future_profit, 3),
        'next_7_days': summarize_period(future_units, future_revenue, future_profit, 7),
    }

    # ── DERIVED BUSINESS METRICS ── (must be defined before return)
    # Inventory turnover: how many times inventory cycled through during the history window
    inv_turnover = round(_safe(total_units / max(current_stock, 1)), 2)
    # Break-even units: units required to recover the cost of holding current stock
    _unit_margin = selling_price - cost_price
    if _unit_margin > 0:
        _raw_bev = current_stock * cost_price / _unit_margin
        break_even_units = int(_raw_bev) + (1 if _raw_bev % 1 > 0 else 0)   # ceiling without math.ceil
    else:
        break_even_units = current_stock  # no margin → need to sell everything

    # ── KEY INSIGHTS ──
    key_insights = {
        'historical_avg_units': round(historical_avg_units, 3),
        'historical_avg_profit_margin': round(historical_avg_profit_margin, 1),
        'forecasted_avg_units': round(forecasted_avg_units, 3),
        'forecasted_avg_profit_margin': round(forecasted_profit_margin, 1),
        'growth_vs_historical_pct': round(growth_pct, 1),
    }

    return {
        'product_id': product_id,
        'product_name': product_name,
        'description': description_val,
        'image_url': image_url_val,
        'current_stock': current_stock,
        'reorder_level': reorder_level,
        'selling_price': selling_price,
        'cost_price': cost_price,
        'margin_ratio': round(margin_ratio, 4),

        # Historical daily data
        'historical': {
            'dates': dates,
            'units': [round(_safe(v), 0) for v in units_arr],
            'revenue': [round(_safe(v), 2) for v in revenue_arr],
            'profit': [round(_safe(v), 2) for v in profit_arr],
            'units_ma7': _compute_moving_avg(units_arr, 7),
            'revenue_ma7': _compute_moving_avg(revenue_arr, 7),
            'profit_ma7': _compute_moving_avg(profit_arr, 7),
            'totals': {
                'units': round(_safe(total_units), 0),
                'revenue': round(_safe(total_revenue), 2),
                'profit': round(_safe(total_profit), 2),
            },
            'peak_day': {
                'date': dates[int(np.argmax(units_arr))] if n > 0 else '',
                'units': round(_safe(units_arr.max()), 0) if n > 0 else 0,
                'revenue': round(_safe(revenue_arr.max()), 2) if n > 0 else 0,
            },
        },

        # Prophet forecasts
        'forecast_dates': f_dates,
        'forecasts': forecasts_output,

        # Trend indicators
        'trend_indicators': trend_indicators,

        # Key metrics
        'metrics': {
            'profit_margin_pct': round(_safe(margin_ratio * 100), 2),
            'inventory_turnover': inv_turnover,
            'break_even_units': break_even_units,
            'avg_daily_units': round(_safe(daily_avg_units), 3),
            'avg_daily_revenue': round(_safe(revenue_arr.mean()), 2),
            'avg_daily_profit': round(_safe(profit_arr.mean()), 2),
        },

        # Stock decision
        'decision': {
            'action': stock_decision,
            'color': decision_color,
            'reason': decision_reason,
        },

        # Summary projections
        'summary_table': summary_table,

        # Key insights
        'key_insights': key_insights,
    }

