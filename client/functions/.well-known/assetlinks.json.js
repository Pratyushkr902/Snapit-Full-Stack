export async function onRequest() {
  return new Response(
    '[{"relation":["delegate_permission/common.handle_all_urls"],"target":{"namespace":"android_app","package_name":"com.snapit.grocery","sha256_cert_fingerprints":["30:A5:0F:20:32:6E:C2:31:EF:E9:2B:84:29:DC:7D:2D:A1:AC:EA:5E:76:0F:AF:FE:6D:46:12:A9:8B:71:BC:B8","06:3C:C8:69:B9:B0:C3:B2:97:F8:03:CA:A4:A7:AD:A2:FB:95:BC:68:78:12:FD:AC:47:A3:F3:DC:F5:4C:0C:B6"]}}]',
    { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
  );
}
