/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, {isServer, webpack}) => {
        if (!isServer) {
            config.externals = config.externals || [];
            config.externals.push('fluent-ffmpeg')
        }

        return config;
    },
    env: {
        FLUENTFFMPEG_COV: false
    },
    images: {
        formats: ['image/avif', 'image/webp'],
    }
};

export default nextConfig;
