/* katex: Client side LaTeX */
$(function () {
  $(".latex-block, .latex-inline").each(function (i, el) {
    katex.render(el.innerText, el);
  });
});

/* Bigfoot: Inline footnotes */
$(function () {
  $.bigfoot({
    actionOriginalFN: "ignore",
  });
});

/* Add flickr links to fancybox */
$('[data-fancybox="gallery"]').fancybox({
  caption: function (instance, item) {
    var caption = $(this).data("caption") || "";

    console.log(item);

    if (item.type === "image") {
      caption =
        '<a href="' +
        item.opts.flickr +
        '">' +
        caption +
        ' <span class="flickrLink">flickr</span></a>';
    }

    return caption;
  },
});

/*
Tabs
Source: https://www.w3schools.com/howto/howto_js_tabs.asp
*/

function changeTab(evt, tabset, tabName) {
  console.log(`showing ${tabset} - ${tabName}`);

  // Hide all tabs
  document
    .querySelectorAll(`div.tabcontent[data-tabset="${tabset}"]`)
    .forEach((tab) => {
      tab.style.display = "none";
    });

  // Show the selected tab
  let activeContent = document.querySelector(
    `div.tabcontent#${tabName}[data-tabset="${tabset}"]`
  );
  if (activeContent) {
    activeContent.style.display = "block";
  }

  // Remove active from all tabs
  document
    .querySelectorAll(`button.tablinks[data-tabset="${tabset}"]`)
    .forEach((tab) => {
      tab.classList.remove("active");
    });

  // Add active to the selected tab
  let activeButton = document.querySelector(
    `button.tablinks#${tabName}[data-tabset="${tabset}"]`
  );
  if (activeButton) {
    activeButton.classList.add("active");
  }
}

$(function () {
  let tabsetset = [];

  document.querySelectorAll("button.tablinks").forEach((el) => {
    let attr = el.attributes["data-tabset"].value;
    if (!tabsetset.includes(attr)) {
      tabsetset.push(attr);
      el.click();
    }
  });
});

// Ranking buttons
document.querySelectorAll("a[data-ranked-show]").forEach((el) => {
  el.addEventListener("click", (event) => {
    event.preventDefault();
    const list = el.closest(".ranking");

    list.querySelectorAll("a[data-ranked-show").forEach((a) => {
      if (a === el) {
        a.classList.add("disabled-link");
      } else {
        a.classList.remove("disabled-link");
      }
    });

    if (el.dataset["rankedShow"] === "current") {
      list.querySelectorAll("li[data-future-ranking]").forEach((li) => {
        li.style.display = "none";
      });
    } else {
      list.querySelectorAll("li[data-future-ranking]").forEach((li) => {
        li.style.display = "list-item";
      });
    }
  });
});

document
  .querySelectorAll('a[data-ranked-show="current"]')
  .forEach((el) => el.click());
