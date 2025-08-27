$(document).ready(() => {

    // $(".index").on("click", () => {
    //     $(".index-item").toggleClass('is-hidden');
    //   });
    //   $(".nav-svg1").on("click", () => {
    //     $(".index-item").toggleClass('is-hidden');
    //   });

      $(".index").on("click", event => {
        $(".list-projects").toggleClass('is-hidden1');
      });

      $(".section-about-us").on("click", event => {
        $(".description-text").toggleClass('is-hidden');
      });

      $('.list-projects').on('click', '.list-projects1', function () {
        $(this).next('.index-item').toggleClass('is-hidden');   
        $(this).find('.nav-svg1').toggleClass('rotated');   
      });


     $('.nav-svg2').on('click',()=>{
        $('.search-filter').toggleClass('is-hidden');
     } )



    //   $(function () {
    //     $(".list-item").on("click", function () {
    //       $(this).find(".nav-svg1").toggleClass("rotated");
    //     });
    //   });
    $(".list-item").on("click", function (e) {
        if ($(e.target).hasClass("nav-svg2")) return; // ignore search button
        $(this).find(".nav-svg1").toggleClass("rotated");
      });

      $(function () {
  
        $(".list-projects1").on("click", function (event) {        
          $(event.currentTarget).find(".nav-svg1").toggleClass("rotated");
        //   // If you also want to toggle the content box
        //   $(".index-item").toggleClass("is-hidden");
        });
      });
    
    })


  const trigger = document.getElementById('mobileTrigger');
  const overlay = document.getElementById('mobileOverlay');

  function toggleOverlay() {
    const willOpen = !overlay.classList.contains('open');
    overlay.classList.toggle('open', willOpen);
    trigger.setAttribute('aria-expanded', String(willOpen));
    overlay.setAttribute('aria-hidden', String(!willOpen));
    document.body.classList.toggle('menu-open', willOpen);
  }

  trigger?.addEventListener('click', toggleOverlay);

  // Optional: close on ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) toggleOverlay();
  });

  // Optional: close when a link is clicked
  overlay.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link) toggleOverlay();
  });

