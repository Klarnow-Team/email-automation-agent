"""Helpers for building signed tracking URLs and injecting them into campaign HTML."""
import re
import hmac
import hashlib
import urllib.parse


def _sign(secret: str, payload: str) -> str:
    return hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()


def build_open_url(base_url: str, secret: str, campaign_id: int, subscriber_id: int) -> str:
    """Build signed URL for the open tracking pixel."""
    base_url = base_url.rstrip("/")
    payload = f"open:{campaign_id}:{subscriber_id}"
    sig = _sign(secret, payload)
    return f"{base_url}/t/open?c={campaign_id}&s={subscriber_id}&sig={sig}"


def build_click_url(
    base_url: str, secret: str, campaign_id: int, subscriber_id: int, destination_url: str
) -> str:
    """Build signed redirect URL for click tracking."""
    base_url = base_url.rstrip("/")
    encoded = urllib.parse.quote(destination_url, safe="")
    payload = f"click:{campaign_id}:{subscriber_id}:{destination_url}"
    sig = _sign(secret, payload)
    return f"{base_url}/t/click?c={campaign_id}&s={subscriber_id}&url={encoded}&sig={sig}"


def inject_tracking_html(
    html: str,
    base_url: str,
    secret: str,
    campaign_id: int,
    subscriber_id: int,
) -> str:
    """
    Inject open tracking pixel and wrap <a href="..."> links with click redirect.
    """
    if not base_url:
        return html

    # 1) Wrap links: replace href="..." with tracking redirect (skip mailto:, tel:, #, and already our tracking domain)
    click_base = base_url.rstrip("/").lower()

    def replace_href(match: re.Match) -> str:
        full = match.group(0)
        quote_char = match.group(1)
        href = match.group(2)
        href_stripped = (href or "").strip()
        if (
            not href_stripped
            or href_stripped.startswith(("mailto:", "tel:", "#"))
            or click_base in href_stripped.lower()
        ):
            return full
        new_url = build_click_url(base_url, secret, campaign_id, subscriber_id, href_stripped)
        return f"href={quote_char}{new_url}{quote_char}"

    html = re.sub(r"href=([\"'])(.+?)\1", replace_href, html, flags=re.DOTALL | re.IGNORECASE)

    # 2) Inject tracking pixel before </body> or at end
    pixel_url = build_open_url(base_url, secret, campaign_id, subscriber_id)
    pixel_img = f'<img src="{pixel_url}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;" />'
    if "</body>" in html.lower():
        html = re.sub(r"</body>", f"{pixel_img}</body>", html, flags=re.IGNORECASE, count=1)
    else:
        html = html + pixel_img

    return html
