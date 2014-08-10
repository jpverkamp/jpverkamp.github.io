/* Init highlight.js once everything is loaded */
hljs.initHighlightingOnLoad();

/* Initialize nanoGALLERY */
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

/* Initialize lightboxes on all the images */
$(document).delegate('*[data-toggle="lightbox"]', 'click', function(event) {
    event.preventDefault();
    $(this).ekkoLightbox();
});
