// I'm going to query the IDGames archive for Doom wads!
// WAD means "Where's All the Data" and is the file format ID software created for Doom maps back in the day. Fan-made wads continue to be built to this day, and are generally uploaded to the idGames archive.
// The idGames archive also includes maps for Heretic, Strife, and Hexen (and other games with the same engine?)
// Turns out, they have an API, so I'm going to have some fun with it :)
// There is also an API for the Doom Wiki. Most maps aren't on the wiki, but noteworthy/well known/old ones might be. So, that API gets queried too to get a screenshot gallery and wiki link; if no wiki page is found, or it has no images, that's fine; that information is simply omitted.
// Lastly, there is an API for the Ontario Beer Store. Why not find beer pairings?

const app = {};
// url for the idGames archive on DoomWorld
app.idGamesUrl = 'https://www.doomworld.com/idgames/api/api.php';
// url for Doom Wiki
app.doomWikiUrl = 'https://doomwiki.org/w/api.php';
// Once a page has been found on DoomWiki, this is the root path for images
app.doomWikiImgRoot = 'https://doomwiki.org/wiki/Special:Filepath';
app.doomWikiDocRoot = 'https://doomwiki.org/wiki';
// Ontario Beer Store API
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

    // Get beers from the Ontario Beer Api right off the bat. The API doesn't actually take any arguments, so it's easiest just to grab it from the get-go
    const beerPromise = app.getBeers();

    // Store the result of the beer query (aka the "beery")
    beerPromise.then(function(result) {
        app.beers = result;
    })

    // event listeners for each wad to get extra details
    $('.wad-list').on("click", ".wad-item.summary", function(e) {
        // $(this).addClass('hide');
        e.preventDefault();
        $(this).removeClass('summary');
        app.getWadDetails($(this).attr('id'));
    });

    // event listener to show the text file
    $('.wad-list').on("click",".reveal-text", function(e) {
        e.preventDefault();
        $(this).addClass('hide');
        $(this).siblings('.text-file').addClass('text-open');
    })

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
        app.getWads(queryType,query,queryBy,sortBy, 20, ascOrDesc);
    });

    // Event listener for action. Enable or disable inputs that are not needed
    // only search takes input; latestwads or latestvotes just get the list of recent
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
            url: 'https://proxy.hackeryou.com',
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
        // slightly renamed keys in the latestvotes option, since it is technically getting vote ID's instead of file ID's. Same information is present though.
        if (action==='latestvotes') {
            app.showWads(searchResults.content.vote,'file');
        }
        else {
            app.showWads(searchResults.content.file)
        }
    } catch(err) {
        if ('warning' in searchResults) {
            app.showBox(`<p>${searchResults.warning.message}</p>`,'warning')
        }
    }
};

// Do something with the results of the query.
app.showWads = function(wads,idKey='id') {
    // An array isn't returned if there is only one result. Easier to just make it an array here than to add more complicated handling later.
    if (!Array.isArray(wads)) {
        wads = [wads];
    }
    $wadList = $('.wad-list');
    $wadList.empty();

    // For every wad returned, append a summary of it as a search result
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
            <p class="subtitle">Author: ${wad.author}</p>
            ${('date' in wad) ? ('<p class="subtitle">Published: ' + wad.date + '</p>') : ""}
            <p>
            ${wad.description}
            </p>
            ${ (wad.rating !== null) ? '<p><span class="info-item">Rating: </span>'+wad.rating+'</p>' : ''}
            <p><a href="#" class="wad-anchor">Click for more information</a></p>
        </li>
        `;
        $wadList.append(htmlToAppend);
    });
};

// Show a box with some contents
app.showBox = function(contents, addClass="") {
    $wadList = $('.wad-list');
    $wadList.empty();
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
        // query the idgames archive for full details
        const getResults = await $.ajax({
            url: 'https://proxy.hackeryou.com',
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

        // get a beer pairing!
        const pairing = await app.pairBeer(getResults.content);

        app.showWadDetails($wadElement, getResults.content, pairing);
    } catch(err) {
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
    const searchWikiResult = app.searchWiki(wadDetails.title);
    let detailsHtml = `
        <section class='wad-details'>
            ${app.infoLine('Author',wadDetails.author,'p class="subtitle"','Anonymous.')}
            ${app.infoLine('Published',wadDetails.date,'p class="subtitle"')}
            ${app.infoLine('',wadDetails.description,'p',"No description.")}
            ${app.infoLine('Rating',wadDetails.rating)}
            ${app.infoLine('Credits',wadDetails.credits)}
            ${app.infoLine('Base',wadDetails.base)}
            ${app.infoLine('Editors used',wadDetails.editors)}
            ${app.infoLine('Build time',wadDetails.buildtime)}
            ${app.infoLine('Bugs',wadDetails.bugs)}
            ${app.infoLine('File size',app.getSize(wadDetails.size) )}
            ${app.infoLine('idGames url',`<a href=${wadDetails.url}>${wadDetails.url}</a>`)}
        </section>
    `;
    // Add the beer pairing!
    if (beerPairing != null) {
        detailsHtml += `
        <section class="beer">
            <h3>Recommended beer pairing:</h3>
            <div class="img-container">
            <img src="${beerPairing.image_url}" alt="${beerPairing.name}">
            </div>
            <p>${beerPairing.name}</p>
        </section>
        `;
    }
    detailsHtml = `
    ${app.infoLine('',wadDetails.title,'h2','Not named.')}
    <div class="detailsBeerContainer do-fade-in">
        ${detailsHtml}
    </div>
    `;
    $element.append(detailsHtml);

    // Attach the text file
    let textHtml = `
        <section>
            <h3>Text File:</h3>
            <p class="reveal-text"><a href="#">Click to expand the included text file</a></p>
            <div class="text-file">
                <pre>
    ${wadDetails.textfile}
                </pre>
            </div>
        </section>
    `;

    $element.append(textHtml);

    // Add in reviews section if they exist
    if (wadDetails.reviews.review !== null) {
        let reviewArr = wadDetails.reviews.review;
        let reviewHtml='';
        // If only one review exists, it does not return as an array. Make it one for ease of coding.
        if (!Array.isArray(reviewArr)) {
            reviewArr = [reviewArr];
        }
        reviewArr.forEach(function(review) {
            reviewHtml += `
                <li class="box review">
                    <p class="info-item">${(review.username !== null) ? review.username : "Anonymous"}</p>
                    <p>Gave rating: ${review.vote}</p>
                    <p>${review.text}</p>
                </li>
            `;
        });
        reviewHtml = '<section><h3>Reviews:</h3><ul class="reviews scrollbox">' + reviewHtml + '</ul></section>';
        $element.append(reviewHtml);
    }

    // Search the Doom Wiki for the wad, and use it to generate a gallery. If no results, it's fine! We still have the idGames info and the beer pairing.
    searchWikiResult.then(function(result) {
        if (result.imgSrcArray.length===0) {
            return;
        }
        let galleryAppend = `<h3>Image Gallery (from <a href="${result.url}">DoomWiki</a>): </h3><div class="gallery scrollbox">`;
        result.imgSrcArray.forEach(function(imgLink) {
            galleryAppend += `
            <div class="img-container">
                <a href="${imgLink}"><img src="${imgLink}?width=300" alt="Images for ${wadDetails.title} from DoomWiki."></a>
            </div>
            `;
        });
        galleryAppend+='</div>'
        galleryAppend = `<section>${galleryAppend}</section>`;
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

    // get a list of words in the wad title and description
    let wadWords = wad.title.toLowerCase().split(' ').concat(wad.description.toLowerCase().split(' '));
    wadWords = wadWords.filter(word => {
        return word.length>=4;
    })

    // lets add a few for beer reasons. 0th word is generic descriptor, 1st word is something beer related that might match thematically
    const beerWordArr = [
        ['darkness', 'stout'],
        ['dark','stout'],
        ['shadow','stout'],
        ['fire','red'],
        ['lava','red'],
        ['hell', 'red'],
        ['techbase','lager'],
        ['refinery','pilsner'],
    ]

    for (let i=0;i<beerWordArr.length;i++) {
        for (let j=0;j<wadWords.length;j++) {
            if (wadWords[j].includes(beerWordArr[i][0])) {
                wadWords.push(beerWordArr[i][1]);
            }
        }
    }

    // put this on a scale from -2.5 to 2.5. Seemed like a good idea at the time
    let wadRating = parseInt(wad.rating) - 2.5;


    let beerList = [];

    for (let i=0; i<app.beers.length; i++) {
        let beer = app.beers[i];
        if (parseFloat(beer.price) > 50) {
            continue;
        }
        let beerSizeArr = beer.size.toLowerCase().split(" ");

        // positive ratings favour high price.
        // Extreme ratings favour higher ABV.
        let weight = wadRating * (parseFloat(beer.price)/parseFloat(beerSizeArr[0]) - wadRating * parseFloat(beer.abv));

        // no ratings? Have to start somewhere.
        if (parseInt(wad.votes)===0) {
            weight=1;
        }

        // Non-alcoholic beer is only really an option for bad wads.
        // Neither are very good.
        if (beer.type === 'Non-Alcoholic Beer') {
            if (wadRating > 0) {
                weight -= 1000;
            }
            else {
                weight -= wadRating;
            }
        }
        if (beer.size.toLowerCase().includes('keg')) {
            weight /= 1000;
        }
        for (let i=0;i<wadWords.length;i++) {
            if (beer.country.toLowerCase().includes(wadWords[i])) {
                weight += 50;
            }
            if (beer.name.toLowerCase().includes(wadWords[i])) {
                weight += wadWords[i].length * wadWords[i].length * 2;
            }

            if (beer.type.toLowerCase().includes(wadWords[i])) {
                weight += 10;
            }
        }

        if (wadRating > 1.7 && beer.category === "Ontario Craft") {
            weight += 10;
        }
        else if (wadRating < -1.7 && beer.category === "Value") {
            weight += 10;
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
                    resolve();
                };
                img.onerror = function() {
                    reject();
                };
                img.src=beer.image_url;
            }).then(function(result) {
                imgExists=true;
            }).catch(function(err) {
                imgExists=false;
            });
        } catch(err) {
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
    // A bunch of wad authors do weird stuff with their titles, and this often makes it hard to get the exact match on Doom Wiki for some significant wads.
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

    const wikiUrl = searchResults[1][0];

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
    // omit these images!
    const omitImg=['Cacoward.png','Under_construction_icon-yellow.svg','Gold_Hissy.png','Doom2_title.png','NIWA_logo.png','Quake_Wiki_Logo.png','Top100.png','Hell-1.jpg'];
    
    const imgSrcArray = imgArray.filter(function(img) {
        // apply omission
        return !(omitImg.includes(img));
    }).map(function(img) {
        // add root url
        return `${app.doomWikiImgRoot}/${img}`;
    });

    return {
        imgSrcArray: imgSrcArray,
        url: app.doomWikiDocRoot+'/'+wikiUrl
    }
};

// Get beers from beer store API
app.getBeers = async function() {
    let beers=null;
    try {
        beers = await $.ajax({
        url: 'https://proxy.hackeryou.com',
            dataType: 'json',
            method:'GET',
            data: {
                reqUrl: app.beerStoreUrl,
            }
        });
        return beers;
    } catch(err) {
        return null;
    }
};

// Document ready here
$(function() {
    app.init();
});