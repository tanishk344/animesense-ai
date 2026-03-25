from PIL import Image
import os
import shutil

src_img = r"C:\Users\Lenovo\.gemini\antigravity\brain\62af8ffb-c242-45bf-8d18-ddf3b63069e5\media__1774418799810.png"
dest_dir = r"c:\Users\Lenovo\Desktop\Antigravity\AI ANIME ASSITENT\public\assets"

os.makedirs(dest_dir, exist_ok=True)

# Copy the original image
dest_original = os.path.join(dest_dir, "icon.png")
shutil.copy2(src_img, dest_original)

# Resize combinations
sizes = [(32, 'icon-32.png'), (192, 'icon-192.png'), (512, 'icon-512.png')]

with Image.open(src_img) as img:
    for size, name in sizes:
        # Maintain aspect ratio or force resize since it's an icon?
        # Usually icons are forced square, we assume it's roughly square
        resized_img = img.resize((size, size), Image.Resampling.LANCZOS)
        resized_img.save(os.path.join(dest_dir, name))
        print(f"Saved {name}")

print("Icon processing complete.")
