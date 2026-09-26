#!/usr/bin/env python3
"""
black_photo_enhancer.py - Pipeline Modernizado de Pós-Processamento e Estilo Visual (BLACKCORE)
Suporta presets cinematográficos, BLACKCORE Dark, contraste adaptativo e filtros de alta definição.
"""

from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

class BlackPhotoEnhancer:
    @staticmethod
    def process(input_path, output_path, style="blackcore-dark"):
        img = Image.open(input_path).convert("RGB")
        
        if style == "blackcore-dark":
            # Estilo Dark Gothic / High Contrast & Deep Blacks
            enhancer_color = ImageEnhance.Color(img)
            img = enhancer_color.enhance(1.25)
            
            enhancer_contrast = ImageEnhance.Contrast(img)
            img = enhancer_contrast.enhance(1.35)
            
            enhancer_brightness = ImageEnhance.Brightness(img)
            img = enhancer_brightness.enhance(0.92) # Deeper shadows
            
            # Sharpening para textura fina
            img = img.filter(ImageFilter.SHARPEN)
            
        elif style == "cinematic":
            enhancer_color = ImageEnhance.Color(img)
            img = enhancer_color.enhance(1.1)
            enhancer_contrast = ImageEnhance.Contrast(img)
            img = enhancer_contrast.enhance(1.2)
            img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))

        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(output_path, "PNG", quality=95)
        return str(output_path)

if __name__ == "__main__":
    print("BlackPhotoEnhancer carregado com sucesso.")
