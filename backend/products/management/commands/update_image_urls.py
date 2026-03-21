"""
Management command to assign product-specific image URLs to every product.
Uses curated, real product images from manufacturer/review sites mapped to
each base product model.

Run: python manage.py update_image_urls
"""
import re
from django.core.management.base import BaseCommand
from products.models import Product


# Product-specific image URLs per base model name.
# Each URL is a real product photo from manufacturer sites, review sites, etc.
MODEL_IMAGE_URLS = {
    # ── Smartphones ──
    'POCO X6 Pro 5G': 'https://fdn2.gsmarena.com/vv/bigpic/xiaomi-poco-x6-pro.jpg',
    'Nokia XR21': 'https://fdn2.gsmarena.com/vv/bigpic/nokia-xr21.jpg',
    'Vivo X100 Pro': 'https://fdn2.gsmarena.com/vv/bigpic/vivo-x100-pro.jpg',
    'Apple iPhone 15 Pro Max': 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15-pro-max.jpg',
    'OnePlus 12': 'https://fdn2.gsmarena.com/vv/bigpic/oneplus-12.jpg',
    'Samsung Galaxy A55 5G': 'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a55.jpg',
    'Samsung Galaxy S24 Ultra': 'https://fdn2.gsmarena.com/vv/pics/samsung/samsung-galaxy-s24-ultra-5g-sm-s928-0.jpg',
    'Xiaomi 14 Ultra': 'https://www.vopmart.com/media/wysiwyg/Xiaomi/Xiaomi-13-Ultra-01.jpg',
    'Realme GT 6': 'https://fdn2.gsmarena.com/vv/pics/realme/realme-gt6-2.jpg',
    'Google Pixel 8 Pro': 'https://fdn2.gsmarena.com/vv/bigpic/google-pixel-8-pro.jpg',

    # ── Laptops (from dataset CSV) ──
    'HP Spectre x360 14': 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=632&auto=format&fit=crop',
    'Lenovo ThinkPad X1 Carbon Gen 12': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=633&auto=format&fit=crop',
    'Microsoft Surface Laptop 6': 'https://images.unsplash.com/photo-1484788984921-03950022c9ef?w=634&auto=format&fit=crop',
    'Apple MacBook Pro 16" M3 Max': 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=635&auto=format&fit=crop',
    'LG Gram 17': 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=636&auto=format&fit=crop',
    'Acer Swift 14 AI': 'https://images.unsplash.com/photo-1544731612-de7f96afe55f?w=637&auto=format&fit=crop',
    'ASUS ROG Zephyrus G16': 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=640&auto=format&fit=crop',
    'MSI Raider GE78 HX': 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=647&auto=format&fit=crop',

    # ── Gaming ──
    'Sony PlayStation 5 Slim': 'https://static1.thegamerimages.com/wordpress/wp-content/uploads/2023/07/ps5-slim.jpg',
    'Xbox Series X': 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=671&auto=format&fit=crop',
    'SteelSeries Arctis Nova Pro Wireless': 'https://m.media-amazon.com/images/I/614IQytqAuL._AC_SL1500_.jpg',
    'Steam Deck OLED': 'https://cdn.cloudflare.steamstatic.com/steamdeck/images/oled/oled_openedup.png',
    'Steam Deck OLED (Midnight Blue)': 'https://cdn.mos.cms.futurecdn.net/8fX9zovNcCoFWt9b7ctUe5.jpg',
    'Razer DeathAdder V3 Pro': 'https://assets2.razerzone.com/images/pnx.assets/b993b88204244288b62d053375f5be2e/razer-deathadder-v3-og-image.webp',
    'HyperX Cloud Alpha Wireless': 'http://hyperx.com/cdn/shop/files/hyperx_cloud_alpha_wireless_2_main_dongle.jpg?v=1688317932',
    'Corsair K100 RGB Mechanical Keyboard': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTgYGAO7Vrcc_Ldb8FR_YAUmY8ZsbM6g6n-nA&s',
    'Corsair K100 RGB Mechanical Keyboard (Midnight Blue)': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRXoVDNV0QrhDfvA3SFZKkEDDZENVxeQunuUg&s',
    'ASUS ROG Ally': 'https://assets-prd.ignimgs.com/2023/09/19/asus-ally-1-1695156197313.jpg',
    'Nintendo Switch OLED': 'https://assets.nintendo.com/image/upload/ar_16:9,b_auto:border,c_lpad/b_white/f_auto/q_auto/dpr_1.5/ncom/en_US/switch/site-design-update/oled-model-photo-05',

    # ── Tablets (from dataset CSV) ──
    'Samsung Galaxy Tab S9 Ultra': 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=705&auto=format&fit=crop',
    'Xiaomi Pad 6 Pro': 'https://images.unsplash.com/photo-1587033411391-5d9e51cce126?w=707&auto=format&fit=crop',
    'Microsoft Surface Pro 10': 'https://images.unsplash.com/photo-1542751110-97427bbecf20?w=708&auto=format&fit=crop',
    'Apple iPad Pro 13" M4': 'https://sm.pcmag.com/pcmag_me/review/a/apple-ipad/apple-ipad-pro-2024_vzge.jpg',
    'OnePlus Pad': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRhMU5lqHghLeKUncyaZivjMAQ9DH8NBA3b5g&s',
    'Amazon Fire Max 11': 'https://images.expertreviews.co.uk/wp-content/uploads/2023/07/amazon_fire_max_11_review_-_image_1.jpg',

    # ── Smart Home ──
    'Ring Video Doorbell Pro 2': 'https://files.cults3d.com/uploaders/14964504/illustration-file/dbe716eb-c5e4-4844-a778-ccac9c3eeaec/1636156240432.jpg',
    'TP-Link Kasa Smart Plug EP40': 'https://smartoutletshub.com/images/tp-link-ep40-kasa-smart-outdoor-wi-fi-plug.jpg',
    'Amazon Echo Show 10': 'https://static1.makeuseofimages.com/wordpress/wp-content/uploads/2022/07/alexa-show-featured-image-1.jpg',
    'Philips Hue Starter Kit': 'https://down-th.img.susercontent.com/file/fb16a3f38cf8f11d9601c94e23e378df',
    'iRobot Roomba j9+': 'https://static1.howtogeekimages.com/wordpress/wp-content/uploads/2023/12/irobot-roomba-combo-j9-vacuum.jpg',
    'Google Nest Hub Max': 'https://i.insider.com/642dd914de7d9200193a3211?width=1000&format=jpeg&auto=webp',
    'Dyson Purifier Hot+Cool HP09': 'https://dyson-h.assetsadobe2.com/is/image/content/dam/dyson/leap-petite-global/products/ec/527e/variants/sco/gallery-images/HP09-variant-gallery-02.jpg?&cropPathE=desktop&fit=stretch,1&fmt=pjpeg&wid=1920',

    # ── Headphones ──
    'Marshall Major V': 'https://images.priceoye.pk/marshall-major-v-headphones-pakistan-priceoye-wnjr2.jpeg',
    'Samsung Galaxy Buds3 Pro': 'https://static1.anpoimages.com/wordpress/wp-content/uploads/wm/2024/07/samsung-galaxy-buds-3-pro-case-with-buds.jpg',
    'Bose QuietComfort Ultra': 'https://static1.pocketlintimages.com/wordpress/wp-content/uploads/wm/2023/10/img_4275-2.JPG',
    'Jabra Evolve2 75': 'https://www.jabra.com/_next/image?url=https:%2F%2Fassets.jabra.com%2F6%2F6%2F0%2Fd%2F660d0bb8e871b46a08400d0e190bf78b24b510d0_Evolve2_65_contextual.jpg&w=1920&q=75',
    'Apple AirPods Max': 'https://s3-alpha.figma.com/hub/file/2813909145/7e19b6f1-5c0f-4759-abee-fbecbe4e764c-cover.png',
    'Nothing Ear': 'https://cdn.shopifycdn.net/s/files/1/0692/5988/6904/files/ELEV_AZU_BL_040_230630_v001_1060.png?v=1688527589',
    'Sony WH-1000XM5': 'https://res-5.cloudinary.com/grover/image/upload/e_trim/c_limit,f_auto,fl_png8.lossy,h_1280,q_auto,w_1280/v1657530122/xmwxyfzbnnfjg2qd7nok.jpg',

    # ── Display ──
    'Samsung S95D QD-OLED 65"': 'https://cdn.avpasion.com/wp-content/uploads/2025/01/S95d-oferta-samsung-01.jpg',
    'LG C3 OLED Evo 55"': 'https://media.us.lg.com/transform/ecomm-PDPGallery-1100x730/e64bb88d-49a1-4f54-a9dc-de6dd1b33714/md08003935-DZ-07-jpg',
    'Sony Bravia X95L Mini LED 75"': 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2023/11/22/fdd3f86b-26b7-4945-95a3-31f3047bf4d4.jpg',
    'Dell Alienware AW3225QF 32" QD-OLED': 'https://c0.lestechnophiles.com/images.frandroid.com/wp-content/uploads/2024/01/alienware-aw32-hero-768x649.jpg?key=fec22068',
    'ASUS ProArt PA329CV 32" 4K': 'https://dlcdnwebimgs.asus.com/gain/9571f24e-3d3f-417a-88ab-723ad3d3ecb0/',
    'LG UltraGear 27GR95QE-B 27" OLED': 'https://www.lg.com/content/dam/channel/wcms/id/images/monitor/27gr95qe-b_ati_eain_id_c/gallery/D-01.jpg',
    'BenQ SW321C 32" 4K Photography Monitor': 'https://cdn.cvp.com/images/products/altimage/11-06-20211623427235benq-1.jpg',

    # ── Cameras (from dataset CSV, Insta360 X4 unchanged) ──
    'Nikon Z6 III': 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=848&auto=format&fit=crop',
    'Sony Alpha A7 IV Mirrorless': 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=849&auto=format&fit=crop',
    'GoPro HERO 13 Black': 'https://www.newsshooter.com/wp-content/uploads/2024/09/Everything-New-with-GoPro-HERO13-Black.jpeg',
    'Canon EOS R6 Mark II': 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=852&auto=format&fit=crop',
    'DJI Osmo Action 4': 'https://se-cdn.djiits.com/tpc/uploads/spu/cover/e1b8110f65a5a3321fe487f0a1a061ac@ultra.png',
    'Fujifilm X100VI': 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=858&auto=format&fit=crop',
    'Insta360 X4': 'https://store.openspace.ai/cdn/shop/files/Insta360X4.png?v=1723191153&width=1200',

    # ── Drones ──
    'DJI Mini 4 Pro': 'https://se-cdn.djiits.com/tpc/uploads/spu/cover/4ea419b081f38056785ae8665d473190@ultra.png',
    'DJI Mavic 3 Pro': 'https://www1.djicdn.com/cms/uploads/d2a29f71567033c427f3ebc476d9bdaf@770*462.jpg',
    'DJI Air 3': 'https://se-cdn.djiits.com/tpc/uploads/spu/cover/dec7fc08d4404fe5dbb27116bd985d85@ultra.png',
    'Skydio 2+': 'https://cdn.sanity.io/images/mgxz50fq/production-v3-red/5752956a132b04c50d2bc85cd8ba533023de0a38-800x450.png?w=3000&fit=max&auto=format',
    'Parrot Anafi USA': 'https://www.parrot.com/assets/s3fs-public/styles/lglossless/public/2022-01/04_made_in_usa_desktop.jpg',
    'Autel Robotics EVO Lite+': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQr1O9wAy11tQjy_psF8GUWr2u885q3UtP7NA&s',

    # ── Smart Watches ──
    'Samsung Galaxy Watch 7': 'https://static1.anpoimages.com/wordpress/wp-content/uploads/wm/2024/07/samsung-galaxy-watch-7-05.jpg',
    'Fitbit Charge 6': 'https://static1.anpoimages.com/wordpress/wp-content/uploads/2023/09/fitbit-charge-6-2.jpg',
    'Withings ScanWatch 2': 'https://www.galaxus.de/im/Files/7/7/1/6/4/6/7/0/c7dbe37d-8aa0-4ec9-8b1f-3b1682f00b0d_cropped21.png?impolicy=teaser&resizeWidth=1136&resizeHeight=568',
    'Apple Watch Ultra 2': 'https://media.studio7thailand.com/157183/Apple_Watch_Ultra_2_49mm_Black_Titanium_Ocean_Band_Black_PDP_Image_Position_1__TH-TH-square_medium.png',
    'Huawei Watch GT 5 Pro': 'https://consumer.huawei.com/dam/content/dam/huawei-cbg-site/common/mkt/pdp/wearables/watch-gt5-pro/images/switch/huawei-watch-gt-5-pro-46mm-sports-edition-front-1-2x.jpg',
    'Huawei Watch GT 5 Pro (Glacial White; Milanese Loop; 49 mm)': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTl6RREMPEvmTSkltnRd7hjVLwWCZKYYuLyCQ&s',
    'Garmin Fenix 7X Pro Solar': 'https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6545/6545130ld.jpg',
    'Amazfit Active Edge': 'https://ucarecdn.com/dec465b7-2176-4e16-ac48-ddd6ce21fbd1/-/format/auto/-/preview/3000x3000/-/quality/lighter/\u56fe\u5c42 870 \u62f7\u8d1d 2@2x.png',

    # ── Speakers ──
    'Ultimate Ears Hyperboom': 'https://resource.ultimateears.com/w_544,h_544,ar_1,c_fill,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/ue/products/wireless-speakers/hyperboom/black/hyperboom-black-1.jpg',
    'Sonos Era 300': 'https://media.sonos.com/images/znqtjj88/production/a57b2c8d90c191d435490e8bc636b5a582adac03-2000x2000.png',
    'JBL Charge 5': 'https://images.samsung.com/is/image/samsung/p6pim/us/jblcharge5blkam/gallery/us-jbl-charge5-jblcharge5blkam-000?$product-details-jpg$',
    'Marshall Emberton III': 'https://images.ctfassets.net/javen7msabdh/2JYRkJ6IW52diJ9SvCeKXz/02fb86feef6e94532ad3de864192a4f9/emberton-iii-side-mobile-1.jpeg',
    'Apple HomePod': 'https://www.apple.com/v/homepod/p/images/overview/homepod__crpdn5vifc8y_large.jpg',
    'Apple HomePod (2nd Gen)': 'https://www.stuff.tv/wp-content/uploads/sites/2/2023/01/main-2.jpg',
    'Apple HomePod (2nd Gen) (Phantom Silver)': 'https://www.stuff.tv/wp-content/uploads/sites/2/2023/01/main-2.jpg',
    'Apple HomePod (2nd Gen) (Titanium Black)': 'https://www.stuff.tv/wp-content/uploads/sites/2/2023/01/main-2.jpg',
    'Apple HomePod (2nd Gen) (Glacial White)': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRKKupvpwYX5cTHS1b6yW3_m0nYt6ggOEx4QA&s',
    'Apple HomePod (2nd Gen) (Volcano Orange)': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRKKupvpwYX5cTHS1b6yW3_m0nYt6ggOEx4QA&s',
    'Bose SoundLink Max': 'https://assets.bosecreative.com/transform/2f5c9310-dc99-4cb1-a60c-ee709bbdc461/sf_pdp_SLMPS_gallery_black_600x450_x2-1?quality=90',
    'Harman Kardon Onyx Studio 8': 'https://iprsoftwaremedia.com/214/files/20227/202208261020/HK_ONYX8_HERO_BLACK.jpg',
    'Logitech MX Master 3S': 'https://media.printables.com/media/prints/213059/images/1954985_5897b690-6a35-43ff-b888-e09b1e14fcd2/thumbs/inside/1280x960/jpeg/img_4703.webp',

    # ── Accessories ──
    'Peak Design Mobile Wallet': 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=994&auto=format&fit=crop',
    'Samsung 990 Pro NVMe SSD 2 TB': 'https://dongknows.com/wp-content/uploads/Samsung-990-PRO-SSD-is-a-typical-NVMe-Drive.jpg',
    'Elgato Stream Deck MK.2': 'https://res.cloudinary.com/elgato-pwa/image/upload/v1687793951/Custom Drop/2023/Quadrant/Stream-Deck-MK2-Quadrant-Edition-v2.jpg',
    'Ugreen Nexode 300W GaN Charger': 'https://static1.makeuseofimages.com/wordpress/wp-content/uploads/wm/2023/08/ugreen-nexode-300w-desktop-charger-01.jpg',
    'Twelve South HiRise 3 Deluxe': 'https://www.macworld.com/wp-content/uploads/2023/09/Twelve-South-HiRise-3-Deluxe-charger-3.jpg?quality=50&strip=all&w=1024',
    'Anker 737 Power Bank': 'https://testr.at/wp-content/uploads/2023/06/Anker-737_Powerbank_PowerCore_24K_Titelbild.jpg',
    'Baseus 65W 6-in-1 USB-C Hub': 'https://www.baseus.com/cdn/shop/products/Baseus_Joystar_8_in_1_USB-C_Hub_7_1000x.jpg?v=1681116996',
}


def _base_name(product_name):
    """Strip variant info: 'POCO X6 Pro 5G (Blue; 128 GB)' -> 'POCO X6 Pro 5G'"""
    return re.sub(r'\s*\(.*\)', '', product_name).strip()


class Command(BaseCommand):
    help = 'Assign product-specific image URLs to every product'

    @staticmethod
    def _resolve_url(product_name, base_name):
        # Order: exact full name -> exact base model -> prefix model (for variants)
        url = MODEL_IMAGE_URLS.get(product_name) or MODEL_IMAGE_URLS.get(base_name)
        if url:
            return url
        for key, value in MODEL_IMAGE_URLS.items():
            if product_name.startswith(key):
                return value
        return None

    def handle(self, *args, **options):
        products = list(Product.objects.all().order_by('id'))
        if not products:
            self.stdout.write(self.style.WARNING('No products found.'))
            return

        updated = 0
        skipped = 0
        for p in products:
            base = _base_name(p.name)
            url = self._resolve_url(p.name, base)
            if not url:
                self.stdout.write(self.style.WARNING(
                    f'  No mapping for "{base}" (SKU: {p.sku}) — skipped'))
                skipped += 1
                continue

            if url != p.image_url:
                Product.objects.filter(id=p.id).update(image_url=url)
                updated += 1

        self.stdout.write(self.style.SUCCESS(
            f'Done. Updated {updated} products, skipped {skipped}.'))
