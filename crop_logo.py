import os
from PIL import Image, ImageChops

def trim(im):
    bg = Image.new(im.mode, im.size, im.getpixel((0,0)))
    diff = ImageChops.difference(im, bg)
    diff = ImageChops.add(diff, diff, 2.0, -100)
    bbox = diff.getbbox()
    if bbox:
        return im.crop(bbox)
    return im

files = [
    "moonstone-logo.png",
    "icon.png",
    "splash-icon.png",
    "favicon.png",
    "android-icon-foreground.png",
    "android-icon-background.png"
]

base_path = "/home/gotham/Desktop/Moonstone/moonstone/assets/images/"
logo_path = os.path.join(base_path, "moonstone-logo.png")

try:
    img = Image.open(logo_path)
    cropped_img = trim(img)
    
    # User requested approx 200x130 aspect ratio for the 'small' size.
    # We should just crop it first. Scaling is handled by React Native.
    # But let's check the aspect ratio.
    w, h = cropped_img.size
    print(f"Original size: {img.size}")
    print(f"Cropped size: {w}x{h}")
    print(f"New Aspect Ratio: {w/h:.2f}")

    # Save to all locations
    for filename in files:
        target_path = os.path.join(base_path, filename)
        cropped_img.save(target_path)
        print(f"Saved {target_path}")

except Exception as e:
    print(f"Error: {e}")
