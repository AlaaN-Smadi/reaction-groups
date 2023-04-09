'use strict';

const Views = {
    templatesContent: {}, templates: ['groupList', 'reactionList'], mainContainer: "mainContainer",

    init() {
        this.mainContainer = document.getElementById("mainContainer");

        this._loadTemplatsContent(this.templates[0], (err, res) => {
            if (err) { }
            this.navigate('groupList');
        });
    },
    navigate(tab, options) {
        State.warn = false;
        switch (tab) {
            case 'groupList':
                this._loadTemplatsContent('groupList', (err, res) => {
                    if (err) { }
                    State.activePage='groupList';
                    GroupsList.init(options);
                });
                break;

            case 'reactionList':
                this._loadTemplatsContent('reactionList', (err, res) => {
                    if (err) { }
                    State.activePage='reactionList';
                    ReactionsList.init(options);
                });
                break;

            default:
                break;
        }
    },

    _loadTemplatsContent(template, callback) {
        if (this.templatesContent[template]) {
            this._inject(template, callback);
        } else {
            const xhr = new XMLHttpRequest();
            xhr.onload = () => {
                // append new template for future fetch
                this.templatesContent[template] = new DOMParser().parseFromString(xhr.responseText, 'text/html');
                return this._inject(template, callback);
            };
            xhr.onerror = (err) => {
                return callback(`Could not fetch template: ${template}.`);
            };
            xhr.open('GET', `./templates/${template}.html`);
            xhr.send(null);
        }
    },

    _inject(template, callback) {
        // append new template for future fetch
        let html = document.importNode(this.templatesContent[template].querySelector('template').content, true);
        mainContainer.innerHTML = '';
        mainContainer.appendChild(html);
        // calling callback without params
        callback();
    },
}