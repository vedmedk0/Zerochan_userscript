// ==UserScript==
// @name Zerochan_userscript
// @description Избранное для зирочан
// @author Vedmedk0
// @license MIT
// @version 1.0
// @include https://www.zerochan.net/*
// @require https://cdn.bootcss.com/jquery/1.12.4/jquery.min.js
// @require https://cdnjs.cloudflare.com/ajax/libs/jquery-cookie/1.4.1/jquery.cookie.js
// @require https://cdnjs.cloudflare.com/ajax/libs/jquery-json/2.6.0/jquery.json.min.js
// ==/UserScript==


(function() {
    'use strict';
    //alert('pidor');
    //$.cookie('favourites', null);

    //console.log($.evalJSON($.cookie('favourites')))
    //console.log($.cookie('favourites'))


    if (localStorage.getItem('favourites') == null){// Если куки пустые то делаем объект с пустым листом
        //TODO: парсить фэйвориты и заполнять лист оттуда
        var b = parseFavourites()
        setFavourites(b);
    }
    //


    $( "#thumbs2 li" ).each(function( index ) {
        var id =  $(this).find('a').attr('href').substring(1);
        var a = getFavourites();
        //console.log(id);
        var reference = 'https://www.zerochan.net/fav?id=' + id ;
        var refElement = $('<a>',{class:'ajax', href:reference})
        if (a.includes(id)){
            //$(this).append('<a class="ajax" style="color : red" href="'+reference+'">В избранном</a>');
            $(this).append(refElement.css('color','red').text('В избранном'))
        }
        else{
            //$(this).append('<a class="ajax" href="'+reference+'">В избранное</a>');
            $(this).append(refElement.text('В избранное'))
        }

    });
    $('body').on('click', 'a.ajax', function(event) // вешаем обработчик на все ссылки
    {
        event.preventDefault(); // предотвращаем переход по ссылке

        $.get($(this).attr('href'), function(data) // отправляем GET запрос на href, указанный в ссылке
              {
            //console.log(a); //полученные данные не выводим
        })
        var id = $(this).attr('href').split('=')[1]; //получаем id из href
        var a = getFavourites(); // получаем избранные из куков
        if (a.includes(id)){//если такой айди есть то сносим
            a.splice( a.indexOf(id), 1 );
            $(this).removeAttr( 'style' ).text('В избранное');
        } else{ //иначе добавляем
            a.push(id);
            $(this).css('color','red').text('В избранном')
        }
        setFavourites(a);//сохраняем в куки
        //console.log(a);//debug
     })


    function getFavsByPage(pageid){
       var a
       var myname = $('#header li').eq(-1).text().split(' ')
       myname = myname[myname.length - 1]
        $.ajax({
            url: "https://www.zerochan.net/fav/"+myname+"?p="+pageid,
            type: "get",
            async: false,
            success: function (data) {
                a =  $.map($(data).find('#thumbs2 li'),function (el) { return $(el).find('a')[0].pathname.substring(1)})
        },
    });
        return a
    };


    function parseFavourites(){ //заполняем с нуля
        var flag = true
        var i
        var favlist = []
        for (i=0; flag; i++){ //парсить пока страничка не станет пустой
            var pagefavs = getFavsByPage(i)
            if (pagefavs.length > 0 && i < 1000){
                favlist.push(...getFavsByPage(i))}
            else {
                flag = false
            }
        };
        console.log('LOADED FAVOURITES')
        return favlist
    }

    function getFavourites(){return $.evalJSON(localStorage.getItem('favourites'));}

    function setFavourites(newfavs){localStorage.setItem('favourites', $.toJSON(newfavs));}
})();
