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

/* Add flickr links to fancybox */
$( '[data-fancybox="gallery"]' ).fancybox({
    caption : function( instance, item ) {
        var caption = $(this).data('caption') || '';

        console.log(item);

        if ( item.type === 'image' ) {
            caption = '<a href="' + item.opts.flickr + '">' + caption + ' <span class="flickrLink">flickr</span></a>' ;
        }

        return caption;
    }
});
