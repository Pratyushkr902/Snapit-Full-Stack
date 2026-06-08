export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/.well-known/assetlinks.json') {
      return new Response(JSON.stringify([
        {
          "relation": ["delegate_permission/common.handle_all_urls"],
          "target": {
            "namespace": "android_app",
            "package_name": "com.snapit.app",
            "sha256_cert_fingerprints": [
              "A5:69:1A:92:C1:EA:8C:9F:A4:34:16:47:7A:91:E4:93:AD:79:62:D8:4A:CC:70:F9:32:62:38:2B:2A:47:BF:8B"
            ]
          }
        }
      ]), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return env.ASSETS.fetch(request);
  }
}
