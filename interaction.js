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

    const cursor = document.querySelector('.cursor');

    // move the custom cursor
    window.addEventListener('mousemove', (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top  = e.clientY + 'px';
      cursor.style.opacity = '1';
    });
    
    // (optional) hide when leaving the window
    window.addEventListener('mouseleave', () => {
      cursor.style.opacity = '0';
    });
