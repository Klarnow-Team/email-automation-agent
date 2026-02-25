"""
Shared transactional email layout: themed wrapper with logo and unsubscribe footer.
Used by campaigns and automations so all outgoing emails share the same design.
Placeholder {{unsubscribe_url}} is replaced by the caller per subscriber.
"""


def wrap_transactional_html(inner_html: str, logo_url: str = "") -> str:
    """
    Wrap body HTML in the standard layout: gradient background, card, optional logo, footer with Unsubscribe.
    inner_html: the email body (can contain {{name}}, {{email}}, {{id}} and {{unsubscribe_url}} for caller to replace).
    logo_url: absolute URL for the header logo image, or empty to omit.
    """
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
  <style>a{color:#6d5ee8;text-decoration:none;}a:hover{text-decoration:underline;}p{margin:0 0 1em;}p:last-child{margin-bottom:0;}h1,h2,h3{color:#141216;margin:0 0 0.5em;font-weight:600;}</style>
</head>
<body style="margin:0;padding:0;background:linear-gradient(180deg,#f0eef4 0%,#f4f3f6 100%);font-family:'Plus Jakarta Sans',system-ui,-apple-system,sans-serif;font-size:16px;line-height:1.6;color:#141216;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:transparent;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08),0 2px 8px rgba(0,0,0,0.04);background-color:#ffffff;border:1px solid #e8e6ec;">
""" + logo_row + """          <tr>
            <td style="padding:24px 32px 32px;">
              <div style="color:#141216;">
""" + inner_html + """
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 36px;border-top:1px solid #e8e6ec;background-color:#faf9fc;">
              <p style="margin:0 0 12px;font-size:13px;color:#6b6775;line-height:1.5;">
                You received this email because you're subscribed to our list.
              </p>
              <p style="margin:0;">
                <a href="{{unsubscribe_url}}" style="display:inline-block;padding:10px 20px;font-size:14px;font-weight:600;color:#ffffff;background-color:#6d5ee8;border-radius:8px;text-decoration:none;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
