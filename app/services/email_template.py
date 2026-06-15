"""
Shared transactional email layout: themed wrapper with logo and unsubscribe footer.
Used by campaigns and automations so all outgoing emails share the same design.
Placeholder {{unsubscribe_url}} is replaced by the caller per subscriber.
"""

FONT_PRESETS = {
    "jakarta": "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    "helvetica": "Helvetica, Arial, sans-serif",
    "arial": "Arial, Helvetica, sans-serif",
    "georgia": "Georgia, 'Times New Roman', serif",
}

CONTENT_WIDTHS = {
    "compact": 560,
    "regular": 600,
    "wide": 680,
}

DEFAULT_TEMPLATE_SETTINGS = {
    "content_width": "regular",
    "font_preset": "jakarta",
    "body_background": "#eef2f7",
    "content_background": "#ffffff",
    "heading_color": "#141216",
    "text_color": "#4b5563",
    "link_color": "#2563eb",
    "divider_color": "#d7dde7",
    "button_primary_background": "#16a34a",
    "button_primary_text": "#ffffff",
    "secondary_button_style": "outline",
}


def normalize_template_settings(template_settings: dict | None) -> dict:
    normalized = dict(DEFAULT_TEMPLATE_SETTINGS)
    if isinstance(template_settings, dict):
        for key in normalized:
            value = template_settings.get(key)
            if isinstance(value, str) and value.strip():
                normalized[key] = value.strip()
    if normalized["content_width"] not in CONTENT_WIDTHS:
        normalized["content_width"] = DEFAULT_TEMPLATE_SETTINGS["content_width"]
    if normalized["font_preset"] not in FONT_PRESETS:
        normalized["font_preset"] = DEFAULT_TEMPLATE_SETTINGS["font_preset"]
    if normalized["secondary_button_style"] not in {"outline", "dark"}:
        normalized["secondary_button_style"] = DEFAULT_TEMPLATE_SETTINGS["secondary_button_style"]
    return normalized


def wrap_transactional_html(
    inner_html: str,
    logo_url: str = "",
    template_settings: dict | None = None,
) -> str:
    """
    Wrap body HTML in the standard layout: gradient background, card, optional logo, footer with Unsubscribe.
    inner_html: the email body (can contain {{name}}, {{email}}, {{id}} and {{unsubscribe_url}} for caller to replace).
    logo_url: absolute URL for the header logo image, or empty to omit.
    """
    template = normalize_template_settings(template_settings)
    content_width = CONTENT_WIDTHS.get(template["content_width"], CONTENT_WIDTHS["regular"])
    font_family = FONT_PRESETS.get(template["font_preset"], FONT_PRESETS["jakarta"])
    body_background = template["body_background"]
    content_background = template["content_background"]
    heading_color = template["heading_color"]
    text_color = template["text_color"]
    link_color = template["link_color"]
    divider_color = template["divider_color"]
    button_primary_background = template["button_primary_background"]
    button_primary_text = template["button_primary_text"]

    logo_row = ""
    if logo_url:
        safe_url = logo_url.replace("&", "&amp;").replace('"', "&quot;")
        logo_row = """          <tr>
            <td style="padding:32px 32px 16px;text-align:center;">
              <img src=\"""" + safe_url + """\" alt="Klarnow" width="140" height="140" style="display:block;width:140px;height:140px;max-width:140px;max-height:140px;margin:0 auto;border:0;outline:none;text-decoration:none;object-fit:contain;" />
            </td>
          </tr>
"""
    return """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Newsletter</title>
  <style>a{color:""" + link_color + """;text-decoration:none;}a:hover{text-decoration:underline;}p{margin:0 0 1em;}p:last-child{margin-bottom:0;}h1,h2,h3{color:""" + heading_color + """;margin:0 0 0.5em;font-weight:600;}</style>
</head>
<body style="margin:0;padding:0;background:""" + body_background + """;font-family:""" + font_family + """;font-size:16px;line-height:1.6;color:""" + text_color + """;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:transparent;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:""" + str(content_width) + """px;margin:0 auto;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08),0 2px 8px rgba(0,0,0,0.04);background-color:""" + content_background + """;border:1px solid """ + divider_color + """;">
""" + logo_row + """          <tr>
            <td style="padding:24px 32px 32px;">
              <div style="color:""" + text_color + """;">
""" + inner_html + """
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 36px;border-top:1px solid """ + divider_color + """;background-color:""" + content_background + """;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="width:50%;vertical-align:top;text-align:left;padding-right:24px;">
                    <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:""" + heading_color + """;">Klarnow</p>
                    <p style="margin:0 0 4px;font-size:13px;color:""" + text_color + """;line-height:1.5;">Pendleton Way, Salford, Greater Manchester, M6 5FW</p>
                    <p style="margin:0 0 12px;font-size:13px;color:""" + text_color + """;line-height:1.5;">United Kingdom</p>
                    <p style="margin:0;font-size:13px;color:""" + text_color + """;">
                      <a href="https://x.com/klarnow" style="color:""" + link_color + """;text-decoration:none;">X</a> &nbsp; <a href="https://www.instagram.com/klarnow/" style="color:""" + link_color + """;text-decoration:none;">Instagram</a> &nbsp; <a href="https://www.linkedin.com/company/klarnow/" style="color:""" + link_color + """;text-decoration:none;">LinkedIn</a>
                    </p>
                  </td>
                  <td style="width:50%;vertical-align:top;text-align:right;">
                    <p style="margin:0 0 12px;font-size:13px;color:""" + text_color + """;line-height:1.5;">
                      You received this email because you signed up on our website or made a purchase from us.
                    </p>
                    <p style="margin:0;">
                      <a href="{{unsubscribe_url}}" style="display:inline-block;padding:10px 20px;font-size:14px;font-weight:600;color:""" + button_primary_text + """;background-color:""" + button_primary_background + """;border-radius:8px;text-decoration:none;">Unsubscribe</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
