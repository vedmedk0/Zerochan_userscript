// ==UserScript==
// @name Zerochan_userscript
// @description Избранное для зирочан
// @author Vedmedk0
// @license MIT
// @version 1.0
// @include https://www.zerochan.net/*
// ==/UserScript==
const fetchOptions = {
    method: 'GET',
    credentials: 'include',
    mode: 'cors'
}

const addToFavsProperties = {
    style: {
        position: 'absolute',
        top: '0px',
        left: '30px'
    },
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" class="bi bi-heart" viewBox="0 0 16 16">
    <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15z"/>
  </svg>`,
}

const removeFromFavsProperties = {
    style: {
        position: 'absolute',
        top: '0px',
        left: '30px'
    },
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" class="bi bi-heart-fill" viewBox="0 0 16 16">
    <path fill-rule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z"/>
  </svg>`,
}

const favPagesLimit = 1000;

function arrayToObj(array) {
    return array.reduce((acc, current) => {
        acc[current] = true;
        return acc;
    }, {});
}

async function toHTMLDocument(response) {
    const textResponse = await response.text();
    const htmlResponse = document.createElement('html');
    htmlResponse.innerHTML = textResponse;
    return htmlResponse;
}

function getIDFromHref(href) {
    const url = new URL(href);
    const id = url.searchParams.get('id');
    return id;
}

function getIDFromNode(node) {
    return node.querySelector('a').pathname.slice(1);
}

class Requester {
    constructor(...urls) {
        this.urls = urls;
    }

    async awaitAll() {
        const requests = this.urls.map(url => fetch(url, fetchOptions));
        let results = [];
        try {
            results = await Promise.all(requests);
        } catch (e) {
            console.error(e);
        }
        return results;
    }

    async awaitFirst() {
        const url = this.urls.shift();
        let result = null;
        try {
            result = await fetch(url, fetchOptions);
        } catch (e) {
            console.error(e);
        }
        return result;
    }
}
class Page {
    constructor(document) {
        this.document = document;
    }
    getUsername() {
        const headerNodes = this.document.querySelectorAll('#header li');
        const loggedIn = headerNodes[headerNodes.length - 1];
        const userLink = loggedIn.querySelector('a');
        const username = userLink.textContent;
        return username;
    }

    getPagesNumber() {
        const pagination = this.document.querySelector('.pagination');
        const paginationText = pagination.textContent;
        const paginationNumbers = paginationText.match(/[0-9]+/gi);
        const pagesNumber = Number(paginationNumbers[1]);
        return pagesNumber;
    }

    getFavsIDs() {
        const favouritesNodes = Array.from(this.document.querySelectorAll('#thumbs2 li'));
        return favouritesNodes.map(getIDFromNode);
    }
}

class FavsParser {
    constructor() {
        this.favouritesIDs = {};
    }

    parseUsername() {
        const currentPage = new Page(document);
        return currentPage.getUsername();
    }

    async parsePagesNumber(username) {
        const response = await new Requester(`https://www.zerochan.net/fav/${username}`).awaitFirst();
        const document = await toHTMLDocument(response);
        return new Page(document).getPagesNumber();
    }

    async fetchPages(username, pagesNumber) {
        const urls = [];
        for (let pageid = 1; pageid <= pagesNumber; pageid++) {
            urls.push(`https://www.zerochan.net/fav/${username}?p=${pageid}`);
        }
        const responses = await new Requester(...urls).awaitAll();
        const pagePromises = responses.map(async (page) => await toHTMLDocument(page));
        return Promise.all(pagePromises);
    }

    parseFavsIDs(pages) {
        const pagesFavourites = pages.map(page => new Page(page).getFavsIDs());
        const favouritesIDs = {}
        pagesFavourites.forEach(pageFavourites => {
            pageFavourites.forEach((favouriteID) => {
                favouritesIDs[favouriteID] = true
            });
        });
        return favouritesIDs;
    }

    async init() {
        const username = this.parseUsername();
        const pagesNumber = await this.parsePagesNumber(username);
        const pages = await this.fetchPages(username, pagesNumber);
        this.favouritesIDs = this.parseFavsIDs(pages);
    }

    getFavsIDs() {
        return this.favouritesIDs;
    }
}

class FavsStorage {
    constructor(favouritesParser) {
        this.favourites = {};
        this.storage = localStorage;
        this.parser = favouritesParser;
    }

    readStorage() {
        return JSON.parse(this.storage.getItem('favourites'));
    }

    async init() {
        const readFavourites = this.readStorage();
        if (readFavourites === null) {
            await this.parser.init();
            const parsedFavourites = this.parser.getFavsIDs();
            this.favourites = parsedFavourites;
            this.saveToStorage();
        } else {
            this.favourites = arrayToObj(readFavourites);
        }
    }

    saveToStorage() {
        const objToArray = Object.keys(this.favourites);
        this.storage.setItem('favourites', JSON.stringify(objToArray));
    }

    add(id) {
        this.favourites[id] = true;
        this.saveToStorage();
    }

    remove(id) {
        delete this.favourites[id];
        this.saveToStorage();
    }

    has(id) {
        return id in this.favourites;
    }

    toggle(id) {
        if (this.has(id)) {
            this.remove(id);
        } else {
            this.add(id);
        }
    }
}

class Link {
    constructor(id, storage) {
        this.id = id;
        this.storage = storage;
        this.isInFavs = false;
        this.href = `https://www.zerochan.net/fav?id=${id}`;
    }

    init() {
        this.element = document.createElement('a');
        this.element.href = this.href;
        this.addEventListener();
        this.isInFavs = this.storage.has(this.id);
        this.setStyle();
    }

    clickHandler = async (e) => {
        e.preventDefault();
        await fetch(this.href, fetchOptions);
        this.storage.toggle(this.id);
        this.isInFavs = !this.isInFavs;
        this.setStyle();
    }

    addEventListener() {
        this.element.addEventListener('click', this.clickHandler);
    }
    setStyle() {
        const properties = this.isInFavs ? removeFromFavsProperties : addToFavsProperties;
        this.element.innerHTML = properties.html;
        Object.assign(this.element.style, properties.style);
    }

    getElement() {
        return this.element;
    }
}

function addLinks(storage) {
    document.querySelectorAll('#thumbs2 li').forEach(node => {
        const id = getIDFromNode(node);
        let link = new Link(id, storage);
        link.init();
        node.style.position = 'relative';
        node.append(link.getElement());
    });
}

function handleSingleLink(storage) {
    document.querySelector('a#fav-link').addEventListener('click', (e) => {
        const id = getIDFromHref(e.target.href);
        storage.toggle(id);
    })
}

const favsParser = new FavsParser();
const storage = new FavsStorage(favsParser);
(async function () {
    await storage.init();
    addLinks(storage);
    handleSingleLink(storage);
})();