
/* nanoGALLERY: Client side flickr */
$(function() {
    $("div.flickr-gallery").each(function(i, el) {
        $(el).nanoGallery({
            userID: '27191036@N05', // jpverkamp
            kind: 'flickr',
            photoset: $(el).attr('data-set-id'),
            thumbnailWidth: 120, thumbnailHeight: 120,
            thumbnailHoverEffect: 'scaleLabelOverImage,borderDarker',
            theme: 'light',
            thumbnailLabel: { display:true, position:'overImageOnMiddle', align:'center' },
            thumbnailLazyLoad: true
        });
    });
});

/* katex: Client side LaTeX */
$(function() {
    $('.latex-block, .latex-inline').each(function(i, el) {
        katex.render(el.innerText, el);
    });
});

/* Bigfoot: Inline footnotes */
$(function() {
    $.bigfoot({
        actionOriginalFN: 'ignore',
    });
});
