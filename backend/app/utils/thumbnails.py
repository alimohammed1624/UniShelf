"""
Thumbnail generation for resource previews.
PDFs render their first page via PyMuPDF; images resize via Pillow.
Output is a small WebP suitable for list/grid views.
"""

import io
import logging

import pymupdf
from PIL import Image

logger = logging.getLogger(__name__)

THUMBNAIL_MAX_DIM = 512  # px, longest edge
THUMBNAIL_WEBP_QUALITY = 70
THUMBNAIL_CONTENT_TYPE = "image/webp"

_PDF_TYPE = "application/pdf"
_IMAGE_PREFIX = "image/"


def thumbnail_object_key(resource_id: int) -> str:
    """MinIO key for a resource's cached thumbnail."""
    return f"thumbnails/{resource_id}.webp"


def supports_thumbnail(content_type: str | None) -> bool:
    """Whether a thumbnail can be generated for this MIME type."""
    if not content_type:
        return False
    return content_type == _PDF_TYPE or content_type.startswith(_IMAGE_PREFIX)


def generate_thumbnail(data: bytes, content_type: str) -> bytes | None:
    """
    Render a WebP thumbnail from raw file bytes.

    Returns None when the file cannot be rendered (corrupt, unsupported
    subtype, decompression bomb, ...) — callers treat that the same as an
    unsupported type and fall back to an icon client-side.
    """
    try:
        if content_type == _PDF_TYPE:
            image = _render_pdf_first_page(data)
        elif content_type.startswith(_IMAGE_PREFIX):
            image = _load_image(data)
        else:
            return None

        if image is None:
            return None

        image.thumbnail((THUMBNAIL_MAX_DIM, THUMBNAIL_MAX_DIM))
        buffer = io.BytesIO()
        image.save(buffer, format="WEBP", quality=THUMBNAIL_WEBP_QUALITY)
        return buffer.getvalue()
    except Exception as e:
        logger.warning(f"Thumbnail generation failed ({content_type}): {e}")
        return None


def _render_pdf_first_page(data: bytes) -> Image.Image | None:
    with pymupdf.open(stream=data, filetype="pdf") as doc:
        if doc.page_count == 0:
            return None
        page = doc[0]
        # Scale so the longest edge lands near THUMBNAIL_MAX_DIM instead of
        # rendering at full resolution and downscaling.
        rect = page.rect
        longest = max(rect.width, rect.height)
        scale = THUMBNAIL_MAX_DIM / longest if longest > 0 else 1.0
        pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False)
        return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def _load_image(data: bytes) -> Image.Image:
    image = Image.open(io.BytesIO(data))
    # WebP encodes RGB/RGBA; normalize palette, CMYK, etc.
    if image.mode not in ("RGB", "RGBA"):
        image = image.convert("RGB")
    return image
