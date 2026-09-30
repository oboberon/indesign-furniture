import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Public app with internal cost data — keep it out of search engines.
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default nextConfig;
