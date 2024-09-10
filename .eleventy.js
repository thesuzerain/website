module.exports = function (eleventyConfig) {
    eleventyConfig.addPassthroughCopy('src/assets');
    eleventyConfig.addPassthroughCopy('src/css');
    eleventyConfig.addWatchTarget('src/css');
    
    return {
        markdownTemplateEngine: "njk",
        dir: {
            input: 'src',
        },
    };
};
