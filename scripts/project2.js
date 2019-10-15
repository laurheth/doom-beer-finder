// I'm going to query the IDGames archive for Doom wads!
// WAD means "Where's All the Data" and is the file format ID software created for Doom maps back in the day. Fan-made wads continue to be built to this day, and are generally uploaded to the idGames archive.
// The idGames archive also includes maps for Heretic, Strife, and Hexen (and other games with the same engine?)
// Turns out, they have an API, so I'm going to have some fun with it :)

const app = {};
app.idGamesUrl = 'https://www.doomworld.com/idgames/api/api.php';
app.doomWikiUrl = 'https://doomwiki.org/w/api.php';
app.doomWikiImgRoot = 'https://doomwiki.org/wiki/Special:Filepath';
app.beerStoreUrl = 'http://ontariobeerapi.ca/beers/';
app.beers = null;

// Initialize the app
app.init = function() {

    app.$actionInput = $('#query-type');
    app.$queryInput = $('#query');
    app.$queryBy = $('#query-by');
    app.$submitButton = $('input[type="submit"]');
    app.$sortBy = $('#sort-by');
    app.$ascDesc = $('input[name="ascDesc"]');

    const beerPromise = app.getBeers();

    beerPromise.then(function(result) {
        app.beers = result;
        // console.log(app.beers);
    })

    // event listeners for each section
    $('.wad-list').on("click", ".wad-item.summary", function(e) {
        // $(this).addClass('hide');
        e.preventDefault();
        $(this).removeClass('summary');
        // console.log($(this).attr('id'));
        app.getWadDetails($(this).attr('id'));
    });

    // event listener for the query button
    $('form').on('submit', function(e) {
        e.preventDefault();
        const queryType = app.$actionInput.val();
        const query = app.$queryInput.val();
        if (queryType==='search' && query.length<3) {
            $('form .warning').removeClass('hide');
            return;
        }
        $('form .warning').addClass('hide');

        const queryBy = app.$queryBy.val();
        const sortBy = app.$sortBy.val();
        let ascOrDesc=$('input[name="ascDesc"]:checked').val();
        // console.log(`console.logapp.getWads(${queryType},${query},${queryBy})`);
        app.getWads(queryType,query,queryBy,sortBy, 20, ascOrDesc);
    });

    // Event listener for action. Enable or disable inputs that are not needed
    app.$actionInput.on('change', function() {
        if (app.$actionInput.val() !== 'search') {
            app.$queryInput.attr("disabled",true);
            app.$queryBy.attr("disabled",true);
            app.$sortBy.attr("disabled",true);
            app.$ascDesc.attr("disabled",true);
        } else {
            app.$queryInput.attr("disabled",false);
            app.$queryBy.attr("disabled",false);
            app.$sortBy.attr("disabled",false);
            app.$ascDesc.attr("disabled",false);
        }
    });
};

// Do a search of the archive
app.getWads = async function(action='search', query="", type='title', sort='date', limit=20, dir='asc') {
    let searchResults;
    try {
        searchResults = await $.ajax({
            url: 'http://proxy.hackeryou.com',
            dataType: 'json',
            method:'GET',
            data: {
                reqUrl: app.idGamesUrl,
                params: {
                    action:action,
                    query:query,
                    type:type,
                    sort:sort,
                    dir:dir,
                    limit: limit,
                    out:'json'
                }
            }
        });
        // console.log(searchResults);
        if (action==='latestvotes') {
            app.showWads(searchResults.content.vote,'file');
        }
        else {
            app.showWads(searchResults.content.file)
        }
    } catch(err) {
        // console.log(err);
        // console.log(searchResults);
        if ('warning' in searchResults) {
            app.showBox(`<p>${searchResults.warning.message}</p>`,'warning')
        }
    }
};

// Do something with the results of the query
app.showWads = function(wads,idKey='id') {
    // An array isn't returned if there is only one reason. Easier to just make it an array here than to add more complicated handling later.
    if (!Array.isArray(wads)) {
        wads = [wads];
    }
    // console.log(wads);
    $wadList = $('.wad-list');
    $wadList.empty();

    wads.forEach(function(wad) {
        if (wad.title === null) {
            wad.title = "Not named."
        }
        if (wad.author === null) {
            wad.author = "Anonymous.";
        }
        if (wad.description === null) {
            wad.description = "No description.";
        }
        const htmlToAppend = `
        <li class="wad-item box summary" id="${wad[idKey]}">
            <h2>${wad.title}</h2>
            <h3>Author: ${wad.author}</h3>
            ${('date' in wad) ? ('<h3>Published: ' + wad.date + '</h3>') : ""}
            <p>
            ${wad.description}
            </p>
            ${ (wad.rating !== null) ? '<p><span class="info-item">Rating: </span>'+wad.rating+'</p>' : ''}
            <a href="#" class="wad-anchor"><p>Click for more information</p></a>
        </li>
        `;
        $wadList.append(htmlToAppend);
    });
};

// Show a box with some contents
app.showBox = function(contents, addClass="") {
    $wadList = $('.wad-list');
    $wadList.empty();
    // console.log($wadList);
    $wadList.append(`
    <li class="box flex-container ${addClass}">
        ${contents}
    </li>
    `);
}

// Get details for a specific wad, based on ID
app.getWadDetails = async function(wadID) {
    const $wadElement = $(`#${wadID}`);
    try {
        const getResults = await $.ajax({
            url: 'http://proxy.hackeryou.com',
            dataType: 'json',
            method:'GET',
            data: {
                reqUrl: app.idGamesUrl,
                params: {
                    action:'get',
                    id:wadID,
                    out:'json'
                }
            } 
        });
        const pairing = await app.pairBeer(getResults.content);
        // console.log(getResults.content);
        // $(`#${wadID} .wad-anchor`).addClass('hide');
        // console.log($wadElement);
        app.showWadDetails($wadElement, getResults.content, pairing);
    } catch(err) {
        console.log(err);
        $wadElement.append('<p class="warning">Something went wrong.</p>');
    }
};

// Didn't feel like rewriting this string of html a bunch of times, so here's a nice helper function
app.infoLine = function(title, info, tag='p', unknown='Not specified.') {
    if (info === null) {
        info=unknown;
    }
    return `
    <${tag}>
        ${(title != '') ? '<span class="info-item">' + title + ': </span>' : ''}
        ${info}
    </${tag}>`;
}

// Display file size in a human readable format
app.getSize = function(bytes) {
    let currentVal = parseInt(bytes);
    let type = 'bytes';
    if (currentVal > 900) {
        currentVal /= 1024
        type = 'kb';
    }
    if (currentVal > 900) {
        currentVal /= 1024
        type = 'mb';
    }
    if (currentVal > 900) {
        currentVal /= 1024
        type = 'gb';
    }
    return `${currentVal.toPrecision(3).toString()} ${type}`
}

// Display the wad information
app.showWadDetails = function($element, wadDetails, beerPairing) {
    $element.empty();
    // $element.addClass('do-fade-in');
    // const beerPairing = app.pairBeer(wadDetails);
    const searchWikiResult = app.searchWiki(wadDetails.title);
    let detailsHtml = `
        <div class='wad-details'>
            ${app.infoLine('Author',wadDetails.author,'h3','Anonymous.')}
            ${app.infoLine('Published',wadDetails.date,'h3')}
            ${app.infoLine('',wadDetails.description,'p',"No description.")}
            ${app.infoLine('Rating',wadDetails.rating)}
            ${app.infoLine('Base',wadDetails.base)}
            ${app.infoLine('Bugs',wadDetails.bugs)}
            ${app.infoLine('Credits',wadDetails.credits)}
            ${app.infoLine('Editors used',wadDetails.editors)}
            ${app.infoLine('Build time',wadDetails.buildtime)}
            ${app.infoLine('File size',app.getSize(wadDetails.size) )}
        </div>
    `;
    // Add the beer pairing!
    if (beerPairing != null) {
        detailsHtml += `
        <div class="beer">
            <h3>Recommended beer pairing:</h3>
            <div class="img-container">
            <img src="${beerPairing.image_url}">
            </div>
            <p>${beerPairing.name}</p>
        </div>
        `;
    }
    detailsHtml = `
    ${app.infoLine('',wadDetails.title,'h2','Not named.')}
    <div class="detailsBeerContainer do-fade-in">
        ${detailsHtml}
    </div>`;
    $element.append(detailsHtml);

    // Add in reviews somehow...
    if (wadDetails.reviews.review !== null) {
        let reviewArr = wadDetails.reviews.review;
        let reviewHtml='';
        // If only one review exists, it does not return as an array. Make it one for ease of coding.
        if (!Array.isArray(reviewArr)) {
            reviewArr = [reviewArr];
        }
        reviewArr.forEach(function(review) {
            reviewHtml += `
                <div class="box review">
                    <p class="info-item">${(review.username !== null) ? review.username : "Anonymous"}</p>
                    <p>Gave rating: ${review.vote}</p>
                    <p>${review.text}</p>
                </div>
            `;
        });
        reviewHtml = '<h3>Reviews:</h3><div class="reviews scrollbox">' + reviewHtml + '</div>';
        $element.append(reviewHtml);
    }

    searchWikiResult.then(function(result) {
        if (result.length===0) {
            return;
        }
        let galleryAppend = '<h3>Image Gallery (from DoomWiki): </h3><div class="gallery scrollbox">';
        result.forEach(function(imgLink) {
            // console.log(imgLink);
            galleryAppend += `
            <div class="img-container">
                <a href="${imgLink}"><img src="${imgLink}?width=300"></a>
            </div>
            `;
        });
        galleryAppend+='</div>'
        $element.append(galleryAppend);
    });
};

// Get a beer pairing for a wad
app.pairBeer = async function(wad) {
    if (app.beer === null) {
        return null;
    }
    if (wad.title === null) {wad.title="None"};
    if (wad.description === null) {wad.description="None"};

    let wadWords = wad.title.toLowerCase().split(' ').concat(wad.description.toLowerCase().split(' '));
    let wadRating = parseInt(wad.rating) - 2.5;

    let beerList = [];

    for (let i=0; i<app.beers.length; i++) {
        let beer = app.beers[i];
        if (parseFloat(beer.price) > 50) {
            continue;
        }
        let beerSizeArr = beer.size.toLowerCase().split(" ");
        // let beerVolume = parseFloat(beerSizeArr[0]) * parseFloat(beerSizeArr[5]);
        // console.log(beerSizeArr[5].split());
        let weight = wadRating * (parseFloat(beer.price)/parseFloat(beerSizeArr[0]) - 2*parseFloat(beer.abv));// + Math.floor(Math.random()*50);
        if (parseInt(wad.votes)===0) {
            weight=1;
        } 
        if (wadRating > 0 && beer.type === 'Non-Alcoholic Beer') {
            weight -= 1000;
        }
        if (beer.size.toLowerCase().includes('keg')) {
            weight /= 1000;
        }
        for (let i=0;i<wadWords.length;i++) {
            if (wadWords[i].length < 4) {
                continue;
            }
            if (beer.country.toLowerCase().includes(wadWords[i])) {
                weight += 50;
            }
            if (beer.name.toLowerCase().includes(wadWords[i])) {
                weight += wadWords[i].length * wadWords[i].length * 2;
            }
        }

        beerList.push({weight:weight*(10+Math.random()), beer:beer});
    }

    // Sort the beer list
    beerList.sort((beerA,beerB) => {
        if (beerA.weight < beerB.weight) {
            return -1;
        }
        else if (beerA.weight > beerB.weight) {
            return 1;
        }
        else {
            return 0;
        }
    });
    beerList.reverse();
    for (let i=0; i<beerList.length;i++) {
        let beer=beerList[i].beer;

        // A bunch of the images don't seem to exist. So, check that they exist, from best match to worst match, and only use the one that exists
        let imgExists=false;

        try {
            await new Promise((resolve,reject) => {
                let img = new Image();
                img.onload = function() {
                    // console.log('image exists')
                    resolve();
                };
                img.onerror = function() {
                    // console.log('image does not exist')
                    reject();
                };
                img.src=beer.image_url;
            }).then(function(result) {
                imgExists=true;
            }).catch(function(err) {
                imgExists=false;
            });
        } catch(err) {
            console.log(err);
            imgExists=false;
        }
        
        if (imgExists) {
            return beer;
        }
    };
    return null;
};

// Search the Doom wiki for extra information
app.searchWiki = async function(rawTitle) {

    // Lets do some trimming of the title
    let title = ((rawTitle.split('-')[0]).split('(')[0]).trim();
    let searchResults=null;
    // Try twice, once with the capitalization given and once with first letters only
    for (let i=0;i<2;i++) {
        searchResults = await $.ajax({
            url: app.doomWikiUrl,
            dataType: 'jsonp',
            method:'GET',
            data: {
                action: 'opensearch',
                search: title,
                redirects: 'resolve',
            }       
        });
        console.log(searchResults);
        if (searchResults[1].length===0) {
            let splitTitle = title.split(' ');
            splitTitle = splitTitle.map(function(word) {
                return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
            })
            if (title !== splitTitle.join(' ')) {
                title = splitTitle.join(' ');
            }
            else {
                break;
            }
        }
        else {
            break;
        }
    }


    const searchPageInfo = await $.ajax({
        url: app.doomWikiUrl,
        dataType: 'jsonp',
        method: 'GET',
        data: {
            action: 'parse',
            page:searchResults[1][0],
            format:'json'
        }
    });
    const imgArray = searchPageInfo.parse.images;
    const imgSrcArray = imgArray.filter(function(img) {
        const omitImg=['Cacoward.png','Under_construction_icon-yellow.svg','Gold_Hissy.png','Doom2_title.png','NIWA_logo.png','Quake_Wiki_Logo.png','Top100.png'];
        return !(omitImg.includes(img));
    }).map(function(img) {
        return `${app.doomWikiImgRoot}/${img}`;
    });
    return imgSrcArray;
};

// Get beers from beer store API
app.getBeers = async function() {
    let beers=null;
    try {
        beers = await $.ajax({
        url: 'http://proxy.hackeryou.com',
            dataType: 'json',
            method:'GET',
            data: {
                reqUrl: app.beerStoreUrl,
            }
        });
        return beers;
    } catch(err) {
        console.log(err);
        return null;
    }
};

// Document ready here
$(function() {
    app.init();
});