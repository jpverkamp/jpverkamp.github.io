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

/*
Tabs
Source: https://www.w3schools.com/howto/howto_js_tabs.asp
*/

function changeTab(evt, tabName) {
    // Declare all variables
    var i, tabcontent, tablinks;

    // Get all elements with class="tabcontent" and hide them
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    // Show the current tab, and add an "active" class to the button that opened the tab
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
} 

$(function() {
    document.querySelectorAll('.tablinks.default').forEach((el) => el.click());
});