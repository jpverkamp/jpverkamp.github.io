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

/* Add alternate content selectors */
$(function() {
    if (!$('*[data-alternate]').is('*')) {
        return;
    }

    var toggleAlternates = function(alt) {
        $('*[data-alternate-target]').each(function(i, el) {
            var $el = $(el);
            if ($el.attr('data-alternate-target') == alt) {
                $el.addClass('active');
            } else {
                $el.removeClass('active');
            }
        });

        $('*[data-alternate]').each(function(i, el) {
            var $el = $(el);
            if ($el.attr('data-alternate') == alt) {
                $el.fadeIn();
            } else {
                $el.hide();
            }
        });
    };

    toggleAlternates($('*[data-alternate]').attr('data-alternate'));

    $('.alt-selector').click(function(event) {
        event.preventDefault();
        toggleAlternates($(event.target).attr('data-alternate-target'));
    });
});
