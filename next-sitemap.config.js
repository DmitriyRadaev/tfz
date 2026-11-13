/** @type {import('next-sitemap').IConfig} */
module.exports = {
    siteUrl: `${process.env.APP_ORIGIN || 'http://172.26.4.9'}/calculate-tfz`,
    generateRobotsTxt: true,
    sitemapSize: 7000,
};
