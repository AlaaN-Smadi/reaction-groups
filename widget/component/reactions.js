
if (typeof buildfire == 'undefined')
    throw 'please add buildfire.js first to use buildfire components';
if (typeof buildfire.components == 'undefined') buildfire.components = {};


buildfire.components.reactions = (() => {

    class Reaction {
        constructor(data = {}) {
            this.itemId = data.itemId || null;
            this.userId = data.userId || null;

            this.reactions = data.reactions || [];
            this._buildfire = data._buildfire || {};
        }
    }

    class Reactions {
        static get TAG() {
            return "$$reactions";
        }

        // options: {itemId, userId, reactionUUID}
        static _insert(options, callback) {
            let reaction = new Reaction({
                itemId: options.itemId,
                userId: options.userId,
                reactions: [{ reactionUUID: options.reactionUUID, createdOn: new Date() }]
            })
            reaction._buildfire.index = this.buildIndex(reaction);

            buildfire.appData.insert(
                reaction, this.TAG, false,
                (err, result) => {
                    if (err) {
                        return callback(err);
                    }
                    buildfire.analytics.trackAction(options.itemId + "-" + options.reactionUUID + "-react");
                    return callback(null, result);
                }
            );
        }

        // options: reaction, reactionUUID, operation, allowMultipleReactions
        static _update(options, callback) {

            if (!options) {
                return callback("Invalid options. Options must be set and have at least reaction, reaction ID and operation properties!");
            }
            if (!["add", "remove", "toggle"].includes(options.operation)) {
                return callback("Invalid operations option. Operations coulde be one of the following:  add, remove or toggle");
            }
            if (!options.reaction) {
                return callback("Invalid options, Missing reaction!");
            }

            if (!options.reactionUUID) {
                return callback("Invalid options, Missing reaction ID!");
            }

            let filter = {
                "_buildfire.index.string1": options.reaction.itemId + '-' + options.reaction.userId
            };
            let obj = {};

            if (options.allowMultipleReactions) {
                if (options.operation == "add" || options.operation == "toggle") {
                    obj = { $addToSet: { reactions: { reactionUUID: options.reactionUUID, createdOn: new Date() }, "_buildfire.index.array1": { string1: "reactionUUID-" + options.reaction.itemId + "-" + options.reactionUUID } } }
                } else if (options.operation == "remove") {
                    obj = { $pull: { reactions: { reactionUUID: options.reactionUUID } } }
                }
            } else {
                if (options.operation == "add" || options.operation == "toggle") {
                    obj = { $set: { reactions: [{ reactionUUID: options.reactionUUID, createdOn: new Date() }], "_buildfire.index.array1": [{ string1: "reactionUUID-" + options.reaction.itemId + "-" + options.reactionUUID }] } }
                } else if (options.operation == "remove") {
                    obj = { $set: { reactions: [], "_buildfire.index.array1": [] } }
                }
            }

            buildfire.appData.searchAndUpdate(filter,
                obj, this.TAG,
                (err, result) => {
                    if (err) {
                        return callback(err);
                    }

                    return callback(null, result);
                }
            );
        }

        // options: {itemId, userId, reactionId=null, reactionUUID}
        static _search(options, callback) {

            if (options.reactionId) {
                buildfire.appData.getById(options.reactionId, this.TAG, (err, result) => {
                    if (err) {
                        return callback(err)
                    }
                    return callback(null, result)
                })
            } else {
                let filter = {
                    "_buildfire.index.string1": options.itemId + '-' + options.userId,
                }
                buildfire.appData.search({ filter, limit: 1 }, this.TAG, (err, result) => {
                    if (err) {
                        return callback(err)
                    }
                    return callback(null, result[0] || {})
                })
            }

        }

        // options: {itemId, userId, reactionId=null, reactionUUID, allowMultipleReactions}
        static unReactReact(options, callback) {
            if (typeof callback !== 'function') {
                return console.error("callback must be a function!");
            }

            if (!options) {
                return callback("Invalid options. Options must be set and have at least oldReactionType, newReactionUUID, userId and itemId properties!");
            }
            if (!options.itemId) {
                return callback("Invalid options, Missing itemId!");
            }
            if (!options.userId) {
                return callback("Invalid options, Messing userId!");
            }
            if (!options.reactionUUID) {
                return callback("Invalid options, Missing reaction ID!");
            }

            this._search(options, (err, result) => {
                if (err) {
                    return callback(err)
                }

                if (result && result.data) {
                    if (result.data.reactions.find((reaction) => reaction.id === options.reactionUUID)) {
                        return callback(null, { status: 'noAction', data: result })
                    } else {
                        const reaction = result.data;
                        const oldReactionType = reaction.reactions.length ? reaction.reactions[0].type : "";
                        reaction.id = result.id;
                        let updateOptions = {
                            reaction: reaction,
                            reactionUUID: options.reactionUUID,
                            operation: "toggle",
                            allowMultipleReactions: options.allowMultipleReactions
                        };
                        this._update(updateOptions, (err, result) => {
                            if (err) {
                                return callback(err);
                            }
                            return callback(null, { status: 'updated', data: result, oldReactionType: oldReactionType })
                        })
                    }
                } else {
                    this._insert(options, (err, result) => {
                        if (err) {
                            return callback(err);
                        }
                        return callback(null, { status: 'added', data: result, oldReactionType: "" })
                    })
                }
            })

        }

        // options: {itemId, userId, reactionId=null, reactionUUID}
        static react(options, callback) {
            if (typeof callback !== 'function') {
                return console.error("callback must be a function!");
            }

            if (!options) {
                return callback("Invalid options. Options must be set and have at least reaction ID, userId and itemId properties!");
            }
            if (!options.itemId) {
                return callback("Invalid options, Missing itemId!");
            }

            if (!options.reactionUUID) {
                return callback("Invalid options, Missing reaction ID!");
            }
            if (!options.userId) {
                return callback("Invalid options, Messing userId!");
            }

            this._search(options, (err, result) => {
                if (err) {
                    return callback(err)
                }
                if (result && result.data) {
                    if (result.data.reactions.find((reaction) => reaction.reactionUUID === options.reactionUUID)) {
                        return callback(null, { status: 'noAction', data: result })
                    } else {
                        const reaction = result.data;
                        reaction.id = result.id;
                        let updateOptions = {
                            reaction: reaction,
                            reactionUUID: options.reactionUUID,
                            operation: "add",
                            allowMultipleReactions: options.allowMultipleReactions
                        };
                        this._update(updateOptions, (err, res) => {
                            if (err) {
                                return callback(err);
                            }
                            return callback(null, { status: 'updated', data: res, oldData: result.data })
                        })
                    }
                } else {
                    this._insert(options, (err, result) => {
                        if (err) {
                            return callback(err);
                        }
                        return callback(null, { status: 'added', data: result });
                    })
                }
            })
        }

        // options: {itemId, userId, reactionId=null, reactionUUID}
        static unReact(options, callback) {
            if (typeof callback !== 'function') {
                return console.error("callback must be a function!");
            }

            if (!options) {
                return callback("Invalid options. Options must be set and have at least reaction ID, userId and itemId properties!");
            }
            if (!options.itemId) {
                return callback("Invalid options, Missing itemId!");
            }
            if (!options.userId) {
                return callback("Invalid options, Messing userId!");
            }
            if (!options.reactionUUID) {
                return callback("Invalid options, Missing reaction ID!");
            }

            this._search(options, (err, result) => {
                if (err) {
                    return callback(err)
                }

                if (result && result.data) {
                    if (!result.data.reactions.find((reaction) => reaction.reactionUUID === options.reactionUUID)) {
                        return callback(null, { status: 'noAction', data: result })
                    } else {

                        const reaction = result.data;
                        reaction.id = result.id;

                        // if the reaction type that we are going to remove is the only one left, delte the whole records
                        if (reaction.reactions.length == 1) {
                            buildfire.appData.delete(reaction.id, this.TAG, (err, result) => {
                                if (err && err.code == "NOTFOUND") {
                                    return callback(null, { status: 'noAction' });
                                } else if (err) {
                                    return callback(err);
                                }
                                buildfire.analytics.trackAction(options.itemId + "-" + options.reactionUUID + "-unReact");
                                return callback(null, { status: 'deleted' });
                            });

                        } else { // remove only the reaction type from the array

                            let updateOptions = {
                                reaction: reaction,
                                reactionUUID: options.reactionUUID,
                                operation: "remove",
                                allowMultipleReactions: options.allowMultipleReactions
                            };

                            this._update(updateOptions, (err, result) => {
                                if (err) {
                                    return callback(err);
                                }
                                buildfire.analytics.trackAction(options.itemId + "-" + options.reactionUUID + "-unReact");
                                return callback(null, { status: 'deleted', data: result })
                            })
                        }
                    }
                } else {
                    return callback(null, { status: 'noAction' });
                }
            })
        }
        // options: { itemId, pageIndex, pageSize }
        static get(options, callback) { // fetch who reacted for specific item
            if (!callback || typeof callback !== 'function') {
                return console.error("callback must be a function!");
            }

            if (!options) {
                return callback("missing get options!");
            }
            let { itemId, pageIndex, pageSize } = options;

            if (!itemId) {
                return callback("Invalid get options!");
            }

            if (typeof pageIndex !== 'number') {
                pageIndex = 0;
            }

            if (!pageSize) {
                pageSize = 50;
            }

            // get all available types for this item
            let inArr = ReactionsTypes.itemsReactionsTypes[itemId].map(reaction => {
                return `reactionUUID-${itemId}-${reaction.id}`
            })

            let filter = { "_buildfire.index.array1.string1": { $in: inArr } }

            buildfire.appData.search(
                {
                    filter, page: pageIndex, pageSize, recordCount: true
                }, this.TAG,
                (err, result) => {
                    if (err) {
                        return callback(err);
                    }

                    if (result) {
                        return callback(null, result);
                    }
                    return callback(null, null);
                }
            );
        }

        static getByUserId(userId, itemIds, callback) {
            if (!callback || typeof callback !== 'function') {
                return console.error("callback must be a function!");
            }

            if (!userId || typeof userId !== 'string' || !itemIds || !itemIds.length) {
                return callback('Invalid arguments');
            }

            let inArray = itemIds.map(itemId => (itemId + '-' + userId))
            let searchOptions = {
                filter: { "_buildfire.index.string1": { $in: inArray } }
            }

            buildfire.appData.search(searchOptions, this.TAG, (err, result) => {
                if (err) {
                    return callback(err);
                }
                if (result) {
                    return callback(null, result);
                }
                return callback(null, null);
            })
        }

        static buildIndex(data = {}) {
            const index = {
                string1: data.itemId + '-' + data.userId,
                array1: data.reactions.map(reaction => ({ string1: "reactionUUID-" + data.itemId + "-" + reaction.reactionUUID }))
            };

            return index;
        }
    }

    class ReactionsSummary {
        constructor(data = {}) {
            this.itemId = data.itemId || null;
            this.reactions = data.reactions || []; // reaction types {type, count, lastReactionBy} 

            this._buildfire = data._buildfire || {}
        }
    }

    class ReactionsSummaries {
        static get TAG() {
            return "$$reactionsSummary";
        }

        static _search(itemId, callback) {
            let filter = {
                "_buildfire.index.string1": itemId,
            }
            buildfire.appData.search({ filter, limit: 1 }, this.TAG, (err, result) => {
                if (err) {
                    return callback(err)
                }
                return callback(null, result)
            })
        }

        static _create(summery, callback) {
            buildfire.appData.insert(summery, this.TAG, false, (err, result) => {
                if (err) {
                    return callback(err);
                }
                return callback(null, result)
            })
        }

        static _update(filter, data, callback) {
            buildfire.appData.searchAndUpdate(
                filter, data, this.TAG,
                (err, result) => {
                    if (err) return callback(err);

                    callback(null, result);
                }
            );
        }

        static get(itemIds, callback) {
            if (typeof callback !== 'function' || !callback) {
                return console.error("callback must be a function!");
            }

            if (!itemIds || !itemIds.length) {
                return callback("Missing get itemIds!");
            }

            buildfire.appData.search(
                {
                    filter: {
                        "_buildfire.index.string1": { $in: itemIds }
                    }
                }, this.TAG,
                (err, result) => {
                    if (err) {
                        return callback(err);
                    }

                    if (result) {
                        return callback(null, result);
                    }
                    return callback(null, null);
                }
            );
        }
        // options = { itemId, reactionUUID, userId }
        static increment(options, callback) {
            if (!callback || typeof callback !== 'function') {
                return console.error("callback must be a function!");
            }
            if (!options) {
                return callback("Invalid options!");
            }
            if (!options.itemId) {
                return callback("Invalid options, Missing increment itemId!");
            }
            if (!options.reactionUUID) {
                return callback("Invalid options, Missing increment reaction ID!");
            }
            if (!options.userId) {
                return callback("Invalid options, Missing increment userId!");
            }

            let { itemId, reactionUUID, userId } = options;
            this._search(itemId, (err, result) => {
                if (err) {
                    return callback(err);
                }
                if (!result || !result.length) {
                    let summery = new ReactionsSummary({
                        itemId,
                        reactions: [{ reactionUUID, count: 1, lastReactionBy: userId }]
                    })
                    summery._buildfire.index = this.buildIndex(summery);
                    this._create(summery, (err, res) => {
                        if (err) {
                            return callback(err);
                        }
                        return callback(null, { status: 'done' })
                    })
                } else {
                    let reactionData = result[0].data.reactions.find(reaction => reaction.reactionUUID == reactionUUID);
                    let filter = {}, obj = {};
                    if (reactionData) {
                        filter = {
                            "_buildfire.index.string1": itemId,
                            "reactions.reactionUUID": reactionUUID,
                        }
                        obj = { $inc: { "reactions.$.count": 1 }, $set: { "reactions.$.lastReactionBy": userId } }
                    } else {
                        filter = {
                            '_buildfire.index.string1': itemId,
                        }
                        obj = { $addToSet: { reactions: { reactionUUID, count: 1, lastReactionBy: userId }, "_buildfire.index.array1": { string1: 'reactionUUID-' + reactionUUID } } }
                    }

                    this._update(filter, obj, (err, res) => {
                        if (err) {
                            return callback(err)
                        }
                        return callback(null, { status: 'done' })
                    })
                }
            })
        }
        // options = { itemId, reactionUUID }
        static decrement(options, callback) {
            if (!callback || typeof callback !== 'function') {
                return console.error("callback must be a function!");
            }
            if (!options) {
                return callback("Invalid options, Missing decrement options!");
            }
            if (!options.reactionUUID) {
                return callback("Invalid options, Missing decrement reaction ID!");
            }
            if (!options.itemId) {
                return callback("Invalid options, Missing decrement itemId!");
            }

            let { itemId, reactionUUID } = options;
            this._search(itemId, (err, result) => {
                if (err) {
                    return callback(err);
                }
                if (!result || !result.length) {
                    let summery = new ReactionsSummary({
                        itemId,
                        reactions: [{ reactionUUID, count: 0, lastReactionBy: null }]
                    })
                    summery._buildfire.index = this.buildIndex(summery);
                    this._create(summery, (err, res) => {
                        if (err) {
                            return callback(err);
                        }
                        return callback(null, { status: 'done' })
                    })
                } else {
                    let typeData = result[0].data.reactions.find(reaction => reaction.reactionUUID == reactionUUID);
                    let filter = {}, obj = {};
                    if (typeData) {
                        filter = {
                            "_buildfire.index.string1": itemId,
                            "reactions.reactionUUID": reactionUUID,
                        }
                        obj = { $inc: { "reactions.$.count": typeData.count > 0 ? -1 : 0 }, $set: { "reactions.$.lastReactionBy": null } }
                    } else {
                        filter = {
                            '_buildfire.index.string1': itemId,
                        }
                        obj = { $addToSet: { reactions: { reactionUUID, count: 0, lastReactionBy: null }, "_buildfire.index.array1": { string1: 'reactionUUID-' + reactionUUID } } }
                    }

                    this._update(filter, obj, (err, res) => {
                        if (err) {
                            return callback(err)
                        }
                        return callback(null, { status: 'done' })
                    })
                }
            })

        }

        static buildIndex(data = {}) {
            const index = {
                string1: data.itemId,
                array1: data.reactions.map(reaction => ({ string1: 'reactionUUID-' + reaction.reactionUUID }))
            };

            return index;
        }
    }

    class ReactionsTypes {
        static itemsReactionsTypes = {};
        static groups = [];

        static get TAG() {
            return "$$reactionsGroups";
        }

        static getReactionsGroups(options, callback) {
            if (!callback || typeof callback !== 'function') {
                return console.error("callback must be a function!");
            }

            buildfire.appData.get(this.TAG, (err, result) => {
                if (err) return callback(err)

                if (!result.data || !result.data.groups || !result.data.groups.length) {
                    return callback('No reaction groups added yet', null)
                }

                this.groups = result.data.groups;
                return callback(null, this.groups);
            });
        }

        static getReactionsTypes(options, callback) {
            const { groupName, itemId } = options;

            if (!callback || typeof callback !== 'function') {
                return console.error("callback must be a function!");
            }

            if (!itemId) {
                return callback("missing itemId", null);
            }

            let group = null;
            if (groupName) {
                for (let i = 0; i < this.groups.length; i++) {
                    if (this.groups[i].name.toLowerCase() === groupName.toLowerCase()) {
                        group = this.groups[i];
                        break;
                    }
                }
            } else {
                group = this.groups[0];
            }

            if (!group || !group.reactions || !group.reactions.length) {
                return callback('No reactions added yet', null)
            }

            const allActiveReactions = group.reactions.filter(reaction => (reaction.isActive == true && reaction.selectedUrl && reaction.unSelectedUrl));
            this.itemsReactionsTypes[itemId] = allActiveReactions;

            return callback(null, allActiveReactions);
        }

        static validateReactionTypes(options, callback) {
            const { reactionUUID, itemId } = options;

            if (!reactionUUID) {
                return callback('Missing Reaction ID');
            }
            if (!itemId) {
                return callback('Missing itemId');
            }

            let validState = this.itemsReactionsTypes[itemId].find(reaction => reaction.id == reactionUUID);

            if (validState) {
                return callback(null, validState)
            }
            return callback('Invalid Reaction ID');
        }
    }

    class State {
        // debounce getting item reactions to avoid multi-request to server
        static _itemIds = [];
        static _timer;
        static _observerContainers = [];
        static _observerTimer;
        static onLogin_onLogout_set = false;

        // options = {itemId, getUsersData, getSummariesData}
        static debounce(options) {
            let { itemId, getUsersData, getSummariesData } = options;
            if (!itemId) {
                return console.error("Missing itemId");
            }
            // to save new item ids that will be rendered
            if (itemId && State._itemIds.indexOf(itemId) < 0) {
                State._itemIds.push(itemId);
            }

            clearTimeout(State._timer);
            State._timer = setTimeout(() => {
                let requestedIds = [...State._itemIds];
                State._itemIds = []; // if the user send new itemIds after the delay and before getting the res from db

                if (getSummariesData) {
                    ReactionsSummaries.get(requestedIds, (err, res) => {
                        if (err) console.error(err)
                        if (res) {/* show reaction summaries on items */
                            State._showAllReactionCount(res, requestedIds);
                        }
                    });
                }
                if (getUsersData) {
                    buildfire.auth.getCurrentUser((err, user) => {
                        if (err) return console.error(err);

                        if (user && user._id) {
                            Reactions.getByUserId(user._id, requestedIds, (error, result) => {
                                if (error) console.error(error);
                                if (result) {/* show users reactions on items */
                                    State._showUserReactions(result)
                                }
                            })
                        }
                    });
                }
            }, 50)
        }

        static _showAllReactionCount(summaries, itemIds) {
            // print reactions count in the dom
            summaries.forEach(summery => {
                let container = document.querySelector(`[bf-reactions-itemid="${summery.data.itemId}"]`),
                    iconIds = [], btnWidth = 1;
                let totalReactionCount = 0;
                if (container) {
                    summery.data.reactions.forEach(reaction => {
                        ReactionsTypes.validateReactionTypes({ reactionUUID: reaction.reactionUUID, itemId: summery.data.itemId }, (err, res) => {
                            if (err) console.error(err);
                            else if(res && reaction.count>0){
                                totalReactionCount += reaction.count;
                                iconIds.push(res.id);
                                btnWidth += 0.5;
                            }
                        })
                    });

                    let secondaryImages = container.querySelectorAll('[bf-reaction-image-id]');
                    secondaryImages=Array.from(secondaryImages).filter(icon=>{
                        let id = icon.getAttribute('bf-reaction-image-id');
                        return iconIds.includes(id);
                    })

                    secondaryImages.forEach((icon, idx) => {
                        icon.classList.remove('reactions-hidden');
                        icon.style.left = `${(idx + 1) / 2}rem`;
                        icon.style.zIndex = `${(9 - idx)}`;
                        idx += 1;
                    })

                    let totalCountContainer = container.querySelector(`[bf-reactions-total-count]`);
                    let btnContainer = container.querySelector(`[bf-reactions-image-container]`);

                    if (totalCountContainer) {
                        totalCountContainer.setAttribute('bf-reactions-total-count', totalReactionCount);
                        totalCountContainer.innerHTML = totalReactionCount;
                        btnWidth += 0.5;
                    }
                    if (btnContainer) {
                        btnContainer.style.width = `${btnWidth}rem`;
                    }

                    this.correctReactionIconsPosition(summery.data.itemId);
                }
            })
            // show all count containers
            let countContainers = document.querySelectorAll("[bf-reactions-total-count]");
            countContainers.forEach(el => {
                el.style.visibility = 'visible';
            })
        }

        static _showUserReactions(reactions) {
            reactions.forEach(reaction => {
                // check if the reaction is valid or not
                if (reaction && reaction.data && reaction.data.itemId && reaction.data.reactions && reaction.data.reactions.length) {
                    ReactionsTypes.validateReactionTypes({ itemId: reaction.data.itemId, reactionUUID: reaction.data.reactions[0].reactionUUID }, (e, r) => {
                        if (e) {
                            return console.error(e);
                        }
                        if (r) {
                            let container = document.querySelector(`[bf-reactions-itemid="${reaction.data.itemId}"]`);
                            let mainButton = container.querySelector('[bf-reactions-btn]');
                            let userReactionIcon = container ? container.querySelector(`[bf-reactions-uuid="${reaction.data.reactions[0].reactionUUID}"]`) : null;

                            if (container && userReactionIcon) {
                                container.setAttribute('bf-user_react-uuid', reaction.data.reactions[0].reactionUUID);
                                container.setAttribute('bf-user_react-id', reaction.id);
                                userReactionIcon.classList.add('reacted');
                                userReactionIcon.style.color = userReactionIcon.getAttribute('bf-reactions-color');

                                this.correctReactionIconsPosition(reaction.data.itemId);

                                mainButton.src = userReactionIcon.getAttribute('bf-reactions-reacted-url');
                                mainButton.classList.add('reactions-show-main-icon');
                                setTimeout(() => {
                                    mainButton.classList.remove('reactions-show-main-icon');
                                }, 300)
                            }
                        }
                    })
                }
            })
        }

        static correctReactionIconsPosition(itemId){
            let container = document.querySelector(`[bf-reactions-itemid="${itemId}"]`);
            if(container){
                let userReactionType = container.getAttribute('bf-user_react-uuid');
                let secondaryReactionIcons = container.querySelectorAll(`[bf-reaction-image-id]`);
                let selectedIconRemoved = false;

                secondaryReactionIcons=Array.from(secondaryReactionIcons).filter(icon=>(!icon.classList.contains('reactions-hidden')));
                secondaryReactionIcons.forEach((icon,idx)=>{
                    let iconReactionType = icon.getAttribute('bf-reaction-image-id');
                    if(userReactionType == iconReactionType){
                        icon.classList.add('reactions-hidden');
                        selectedIconRemoved = true;
                    }else if(selectedIconRemoved){
                        icon.style.left=icon.style.left = `${((idx + 1) / 2)-0.5}rem`;
                    }else if(!userReactionType){
                        icon.style.left=icon.style.left = `${((idx + 1) / 2)}rem`;
                    }
                })
            }
        }

        static buildObserver(selector) {
            const observer = new MutationObserver((mutationList, observer) => {
                let allAddedElements = [];
                mutationList.forEach(element => {
                    element.addedNodes.forEach(node => {
                        if (node instanceof Element) {
                            // to get all passed elements if added inside other elements
                            allAddedElements.push(node);
                            [...node.querySelectorAll('[bf-reactions-itemid]'), ...node.querySelectorAll('[bf-reactions]')].forEach(internalPassed => allAddedElements.push(internalPassed));
                        }
                    })

                    this.getValidElements(allAddedElements);
                })

                clearTimeout(this._observerTimer);
                this._observerTimer = setTimeout(() => {
                    let newItems = [...this._observerContainers];
                    this._observerContainers = [];
                    this.buildComponentByHTML(newItems);
                }, 50);
            });

            const config = { attributes: true, childList: true, subtree: true };
            let container = document.querySelector(selector);
            if (!selector || !container) {
                return console.error('Missing build selector!')
            } else {
                observer.observe(container, config);

                // check if the selector contains valid elements for build reactions 
                let firstElements = container.querySelectorAll('*');
                this.getValidElements(firstElements);

                let newItems = [...this._observerContainers];
                this._observerContainers = [];
                this.buildComponentByHTML(newItems);
            }
        }

        static getValidElements(elements) {
            elements.forEach(node => {
                let newReactionInstance = {};
                try {
                    if (node.hasAttribute('bf-reactions-itemid')) {
                        let bfOnReaction = node.getAttribute("bf-on-reaction");
                        let onReaction;
                        if (bfOnReaction) {
                            onReaction = window[bfOnReaction];
                        }
                        newReactionInstance = {
                            itemId: node.getAttribute("bf-reactions-itemid"),
                            container: node,
                            groupName: JSON.parse(node.getAttribute("bf-group-name")),
                            showCount: JSON.parse(node.getAttribute("bf-reactions-showCount")),
                            showUsersReactions: JSON.parse(node.getAttribute("bf-reactions-showUsersReactions")),
                            onReaction,
                        }
                        this._observerContainers.push(newReactionInstance);
                    } else if (node.hasAttribute('bf-reactions')) {
                        newReactionInstance = {
                            container: node,
                            ...JSON.parse(node.getAttribute("bf-reactions")),
                        }
                        if (newReactionInstance.onReaction) {
                            newReactionInstance.onReaction = window[newReactionInstance.onReaction];
                        }
                        this._observerContainers.push(newReactionInstance);
                    }
                } catch (error) {
                    return console.error('Error while parsing JSON: ' + error)
                }
            })
        }

        static buildComponentByHTML(elements) {
            elements.forEach(newReaction => {
                new ReactionComponent(newReaction);
            })
        }

        static onLoginStateChanged(user) {
            let validNodes = document.querySelectorAll('[bf-reactions-itemid]');
            validNodes.forEach(node => {
                let mainBtn = node.querySelector('[bf-reactions-default-src]');
                if (mainBtn && !user) {
                    mainBtn.src = mainBtn.getAttribute('bf-reactions-default-src');
                }

                let itemId = node.getAttribute('bf-reactions-itemid');
                if (itemId && user) {
                    State.debounce({ itemId, getUsersData: true });
                }
            })
        }
    }

    class ReactionComponent {
        // Widget side
        constructor(data = {}) {

            if (!data.itemId) {
                return console.error('Missing itemId');
            }
            if (!data.container && !data.selector) {
                return console.error('Missing selector');
            }

            if (data.onReaction) {
                this.onReaction = data.onReaction;
            }

            this.itemId = data.itemId;
            this.groupName = data.groupName || '';
            this.selector = data.selector || null;
            this.container = data.container || null;
            this.container = document.querySelector(this.selector) || this.container;

            this.showCount = typeof data.showCount === 'boolean' ? data.showCount : true; // default true
            this.showUsersReactions = typeof data.showUsersReactions === 'boolean' ? data.showUsersReactions : true; // show who reacted for each reaction
            this.allowMultipleReactions = false;

            if (!ReactionsTypes.groups.length) {
                ReactionsTypes.getReactionsGroups({}, (err, res) => {
                    if (err) return console.error(err);

                    ReactionsTypes.getReactionsTypes({ itemId: this.itemId, groupName: this.groupName }, (error, response) => {
                        if (error) {
                            return console.error(error);
                        }

                        this.reactionsArr = response;
                        this._init();
                    })
                })
            } else if (!ReactionsTypes.itemsReactionsTypes[this.itemId] || !ReactionsTypes.itemsReactionsTypes[this.itemId].length) {
                ReactionsTypes.getReactionsTypes({ itemId: this.itemId, groupName: this.groupName }, (error, response) => {
                    if (error) {
                        return console.error(error);
                    }

                    this.reactionsArr = response;
                    this._init();
                })
            } else {
                this.reactionsArr = ReactionsTypes.itemsReactionsTypes[this.itemId];
                this._init();
            }
        }

        _init() {
            if (this.reactionsArr.length) {
                // crop reaction images 
                this.reactionsArr = this.reactionsArr.map(reaction => {
                    let selectedUrl = buildfire.imageLib.cropImage(reaction.selectedUrl, { size: "half_width", aspect: "1:1" }),
                        unSelectedUrl = buildfire.imageLib.cropImage(reaction.unSelectedUrl, { size: "half_width", aspect: "1:1" });

                    return ({ ...reaction, selectedUrl, unSelectedUrl });
                })
                this._buildComponent();
                State.debounce({ itemId: this.itemId, getUsersData: true, getSummariesData: true });

                if (!State.onLogin_onLogout_set) {
                    buildfire.auth.onLogin((user) => {
                        State.onLoginStateChanged(user)
                    }, true);

                    buildfire.auth.onLogout(() => {
                        State.onLoginStateChanged(null)
                    }, true);

                    State.onLogin_onLogout_set = true;
                }
            } else {
                return console.error('No Reactions added yet');
            }
        }

        _buildComponent() {
            this.container.innerHTML = null;
            // build the component HTML elements
            let iconsContainer = '';
            this.reactionsArr.forEach((reaction, idx) => {
                iconsContainer += ` <div reactions-icon-buttons class="reactions-icon-buttons reaction-container-show">
                                        <img style="animation-duration:${idx / 10 + 0.1}s;" bf-reactions-non-reacted-url="${reaction.unSelectedUrl}" bf-reactions-reacted-url="${reaction.selectedUrl}" bf-reactions-url="${reaction.url}" bf-reactions-uuid="${reaction.id}" class="reactions-clickable-image reactions-icon-animation" src="${reaction.selectedUrl}" />
                                    </div>`
            });
            this.container.setAttribute('bf-reactions-itemid', this.itemId);
            this.container.setAttribute('bf-user_react-uuid', ''); // reaction id from the reaction list
            this.container.setAttribute('bf-user_react-id', '');   // selected reaction id that autogenerated when the user selected
            this.container.classList.add('reactions-main-container');
            let secondaryIcons = ``;

            this.reactionsArr.forEach(icon => {
                secondaryIcons += `<img bf-reaction-image-id="${icon.id}" class="reactions-hidden reactions-secondary-icon" src="${icon.selectedUrl}" />`
            })
            this.container.innerHTML = `
                <div class="reaction-main-button">
                    <div bf-reactions-image-container class="reactions-main-icon-container" >
                        <img bf-reactions-btn class="reactions-main-icon" bf-reactions-default-src="${this.reactionsArr[0].unSelectedUrl}" src="${this.reactionsArr[0].unSelectedUrl}" />
                        ${secondaryIcons}
                    </div>
                    <span style="visibility:hidden;" class="reactions-total-count reactions-hidden" bf-reactions-total-count="0">0</span>
                </div>
                <div class="reactions-icon-container reactions-hidden" bf-reaction-icon-container>${iconsContainer}</div>
            `;

            // show reactions container
            this.holdTimer = null;
            this.holdPeriod = 0;

            let startHoldTimer = (event) => {
                this._hideReactionIcons();
                // prevent download image on iOS
                if (event.target.tagName.toLowerCase() === 'img') {
                    event.preventDefault();
                }
                // press and hold to show reactions list
                this.holdTimer = setInterval(() => {
                    this.holdPeriod += 1;
                    if (this.holdPeriod > 10 && this.reactionsArr.length > 1) {
                        this._showReactionIcons();
                        this.holdPeriod = 0;
                        clearInterval(this.holdTimer);
                    }
                }, 50);
            }

            let clearHoldTimer = () => {
                let reactionIconsContainer = this.container.querySelector('[bf-reaction-icon-container]');
                if ((this.holdPeriod < 10 || this.reactionsArr.length === 1) && reactionIconsContainer && reactionIconsContainer.classList.contains('reactions-hidden')) {
                    let reactionIcons = this.container.querySelectorAll('[bf-reactions-uuid]');
                    let reacted = this.container.querySelector('.reacted');
                    if (reacted) {
                        this._validateUserAndReact(reacted.getAttribute('bf-reactions-uuid'), reacted);
                    } else {
                        this._validateUserAndReact(reactionIcons[0].getAttribute('bf-reactions-uuid'), reactionIcons[0]);
                    }
                }

                this.holdPeriod = 0;
                clearInterval(this.holdTimer);
            }

            let reactionBtn = this.container.querySelector('[bf-reactions-btn]');
            let reactionCountBtn = this.container.querySelector('[bf-reactions-total-count]');

            if (this.showCount) {
                reactionCountBtn.classList.remove('reactions-hidden');
                // show user reactions list
                if (this.showUsersReactions) {
                    reactionCountBtn.addEventListener('click', () => {
                        this._showUsersList();
                    })
                }
            }

            reactionBtn.addEventListener('mousedown', startHoldTimer);
            reactionBtn.addEventListener('touchstart', startHoldTimer);

            reactionBtn.addEventListener('mouseup', clearHoldTimer);
            reactionBtn.addEventListener('touchend', clearHoldTimer);

            let reactionIcons = this.container.querySelectorAll('[bf-reactions-uuid]');
            reactionIcons.forEach(icon => {
                icon.addEventListener('click', (event) => {
                    // prevent download image on iOS
                    if (event.target.tagName.toLowerCase() === 'img') {
                        event.preventDefault();
                    }
                    this._validateUserAndReact(icon.getAttribute('bf-reactions-uuid'), icon);
                })
            })
        }

        _showReactionIcons() {
            let reactionIconsContainer = this.container.querySelector('[bf-reaction-icon-container]');
            if (reactionIconsContainer) {
                reactionIconsContainer.classList.remove('reactions-hidden');
            }

            document.body.addEventListener('click', (e) => {
                if (e && !this.container.contains(e.target)) {
                    this._hideReactionIcons(this.container);
                }
            });
        }

        _validateUserAndReact(newReactionUUID, icon) {
            buildfire.auth.getCurrentUser((err, user) => {
                if (err || !user) {
                    buildfire.auth.login({}, (err, user) => {
                        if (user && user._id) {
                            this._reactionHandler(newReactionUUID, icon, user._id);
                        }
                    });
                } else if (user && user._id) {
                    this._reactionHandler(newReactionUUID, icon, user._id);
                }
            })
        }

        _reactionHandler(newReactionUUID, icon, userId) {
            let userReactUUID = this.container.getAttribute('bf-user_react-uuid');

            let selectedReaction = {
                reactionUUID: newReactionUUID,
                reactionId: this.container.getAttribute('bf-user_react-id') || null,
                itemId: this.container.getAttribute('bf-reactions-itemid'),
            }

            if (userReactUUID) {
                if (userReactUUID === newReactionUUID) {
                    this._deselectReaction({ icon, userReactUUID, userId, selectedReaction })
                } else {
                    this._toggleReaction({ icon, userReactUUID, userId, selectedReaction })
                }
            } else {
                this._addReaction({ icon, selectedReaction, userId })
            }
        }

        _addReaction(options) {
            let { icon, selectedReaction, userId, fromQueue } = options;

            this._hideReactionIconsBox({ newIcon: icon, fromQueue })

            let reactOptions = { itemId: selectedReaction.itemId, userId, reactionUUID: selectedReaction.reactionUUID, allowMultipleReactions: this.allowMultipleReactions }
            if (this.isPending) {
                this.nextRequest = { type: 'add', options }
            } else {
                this.isPending = true;
                Reactions.react(reactOptions, (error, result) => {
                    if (error) {
                        this._hideReactionIconsBox({ oldIcon: icon });
                        return console.error('Error while adding new Reaction: ' + error)
                    } else if (result) {
                        if (result.status === 'added') {
                            this.container.setAttribute('bf-user_react-id', result.data.id);
                            let options = { reactionUUID: selectedReaction.reactionUUID, itemId: selectedReaction.itemId, userId }
                            ReactionsSummaries.increment(options, (err, res) => {
                                this._checkPendingRequest();

                                if (err) return console.error(err);
                                if (res.status === 'done') {

                                } else if (res.status === 'noAction') {
                                    // nothing will be happened
                                }
                            });
                        } else if (result.status === 'updated') {
                            ReactionsSummaries.decrement({ itemId: selectedReaction.itemId, reactionUUID: result.oldData.reactions[0].reactionUUID }, (err, res) => {
                                if (err) return console.error(err)
                            });

                            let incrementOptions = { reactionUUID: selectedReaction.reactionUUID, itemId: selectedReaction.itemId, userId }
                            ReactionsSummaries.increment(incrementOptions, (err, res) => {
                                this._checkPendingRequest();

                                if (err) return console.error(err);
                                if (res.status === 'done') {

                                } else if (res.status === 'noAction') {
                                    // nothing will be happened
                                }
                            });
                            // nothing will be happened
                        } else if (result.status === 'noAction') {
                            this._checkPendingRequest();
                            // nothing will be happened
                        }
                        this.onReaction({ status: 'add', reactionID: selectedReaction.reactionUUID, itemId: selectedReaction.itemId, userId })
                    }
                });
            }
        }

        _toggleReaction(options) {
            let { icon, userReactUUID, userId, selectedReaction, fromQueue } = options;

            let itemId = selectedReaction.itemId
            this._hideReactionIconsBox({ fromQueue, newIcon: icon, oldIcon: this.container.querySelector(`[bf-reactions-uuid="${userReactUUID}"]`) });

            if (this.isPending) {
                this.nextRequest = { type: 'update', options }
            } else {
                this.isPending = true;
                let reactOptions = { itemId, userId, reactionUUID: selectedReaction.reactionUUID, reactionId: selectedReaction.reactionId, allowMultipleReactions: this.allowMultipleReactions }
                Reactions.unReactReact(reactOptions, (error, result) => {
                    if (error) {
                        this._hideReactionIconsBox({ oldIcon: icon, newIcon: this.container.querySelector(`[bf-reactions-uuid="${userReactUUID}"]`) });
                        return console.error('Error while updated the Reaction: ' + error)
                    } else if (result) {
                        // reaction updated successfully 
                        if (result.status === 'updated') {
                            // decrement for the old type and increment the new one
                            ReactionsSummaries.decrement({ itemId, reactionUUID: userReactUUID }, (err, res) => {
                                this._checkPendingRequest();
                                if (err) return console.error(err)
                            });
                            ReactionsSummaries.increment({ itemId, reactionUUID: selectedReaction.reactionUUID, userId }, (err, res) => {
                                this._checkPendingRequest();
                                if (err) return console.error(err)
                            });
                        } else if (result.status === 'added') {
                            this.container.setAttribute('bf-user_react-id', result.data.id);
                            ReactionsSummaries.increment({ itemId, reactionUUID: selectedReaction.reactionUUID, userId }, (err, res) => {
                                this._checkPendingRequest();
                                if (err) return console.error(err)
                            });
                            // nothing will be happened
                        } else if (result.status === 'noAction') {
                            this._checkPendingRequest();
                            // nothing will be happened
                        }
                        this.onReaction({ status: 'update', reactionUUID: selectedReaction.reactionUUID, itemId, userId })
                    }
                })
            }
        }

        _deselectReaction(options) {
            let { icon, userReactUUID, userId, selectedReaction, fromQueue } = options;

            let reactionId = selectedReaction.reactionId;
            let itemId = selectedReaction.itemId;
            let reactionUUID = userReactUUID;

            let reactOptions = { itemId, userId, reactionId, reactionUUID, allowMultipleReactions: this.allowMultipleReactions }

            this._hideReactionIconsBox({ oldIcon: icon, fromQueue });

            if (this.isPending) {
                this.nextRequest = { type: 'delete', options }
            } else {
                this.isPending = true;
                Reactions.unReact(reactOptions, (error, result) => {
                    if (error) {
                        this._hideReactionIconsBox({ newIcon: icon });
                        return console.error('Error while deleting the Reaction: ' + error)
                    } else if (result) {
                        if (result.status === 'deleted') {
                            this.container.setAttribute('bf-user_react-id', '');
                            /* Reaction deleted successfully */
                            ReactionsSummaries.decrement({ itemId, reactionUUID }, (err, res) => {
                                this._checkPendingRequest();
                                if (err) return console.error(err)
                            });
                        } else if (result.status === 'noAction') {
                            this._checkPendingRequest();
                            // nothing will be happened
                        }
                        this.onReaction({ status: 'delete', reactionUUID, itemId, userId })
                    }
                });
            }
        }

        _checkPendingRequest() {
            this.isPending = false;
            if (this.nextRequest) {
                switch (this.nextRequest.type) {
                    case 'add':
                        this._addReaction({ ...this.nextRequest.options, fromQueue: true })
                        break;
                    case 'update':
                        this._toggleReaction({ ...this.nextRequest.options, fromQueue: true })
                        break;
                    case 'delete':
                        this._deselectReaction({ ...this.nextRequest.options, fromQueue: true })
                        break;
                }
            }
            this.nextRequest = {};
        }

        _hideReactionIconsBox(options) {
            let { newIcon, oldIcon, fromQueue } = options;

            this._hideReactionIcons();

            if (!fromQueue) {
                let mainButton = this.container.querySelector('[bf-reactions-btn]');

                if (oldIcon) {
                    oldIcon.classList.remove('reacted');
                    this.container.setAttribute('bf-user_react-uuid', '');
                    this.container.setAttribute('bf-user_react-id', '');
                }

                if (newIcon) {
                    newIcon.classList.add('reacted');
                    this.container.setAttribute('bf-user_react-uuid', newIcon.getAttribute('bf-reactions-uuid'));

                    mainButton.src = newIcon.getAttribute('bf-reactions-reacted-url');
                    mainButton.classList.add('reactions-show-main-icon');
                    setTimeout(() => {
                        mainButton.classList.remove('reactions-show-main-icon');
                    }, 300)
                    State.correctReactionIconsPosition(this.itemId);
                }

                let reactionsCountContainer = this.container.querySelector('[bf-reactions-total-count]');
                if (newIcon && !oldIcon && reactionsCountContainer) {
                    let reactionsCount = reactionsCountContainer.getAttribute('bf-reactions-total-count');
                    let newCount = parseInt(reactionsCount) + 1;
                    reactionsCountContainer.setAttribute('bf-reactions-total-count', newCount);
                    reactionsCountContainer.innerHTML = newCount;
                }

                if (!newIcon && oldIcon) {
                    let reactionsCount = reactionsCountContainer.getAttribute('bf-reactions-total-count');
                    let newCount = parseInt(reactionsCount) - 1;
                    newCount = newCount >= 0 ? newCount : 0
                    reactionsCountContainer.setAttribute('bf-reactions-total-count', newCount);
                    reactionsCountContainer.innerHTML = newCount;

                    mainButton.src = this.reactionsArr[0].unSelectedUrl;
                    mainButton.classList.add('reactions-show-main-icon');
                    setTimeout(() => {
                        mainButton.classList.remove('reactions-show-main-icon');
                    }, 300)
                }
            }
        }

        _hideReactionIcons(hideElement) {
            if (hideElement) {
                let reactionBox = hideElement.querySelector('[bf-reaction-icon-container]')
                reactionBox.classList.remove('reaction-container-show');
                reactionBox.classList.add('reaction-container-hide');
                setTimeout(() => {
                    reactionBox.classList.remove('reaction-container-hide');
                    reactionBox.classList.add('reaction-container-show');
                    reactionBox.classList.add('reactions-hidden');
                }, 250)
            } else {
                document.querySelectorAll('[bf-reaction-icon-container]').forEach(reactionBox => {
                    reactionBox.classList.remove('reaction-container-show');
                    reactionBox.classList.add('reaction-container-hide');
                    setTimeout(() => {
                        reactionBox.classList.remove('reaction-container-hide');
                        reactionBox.classList.add('reaction-container-show');
                        reactionBox.classList.add('reactions-hidden');
                    }, 250)
                })
            }
        }

        _showUsersList() {
            let listItems = [];
            buildfire.spinner.show();

            let _setUsersList = (reactions, index, callBack) => {
                let reaction = reactions[index];

                let reactionObject = this.reactionsArr.find(reactionType => reactionType.id === reaction.data.reactions[0].reactionUUID);
                if (reactionObject) {
                    let url = reactionObject.selectedUrl;

                    buildfire.auth.getUserProfile({ userId: reaction.data.userId }, (err, user) => {
                        if (err) return console.error(err);
                        listItems.push({
                            text: `<div style="display: flex; gap: 1rem; align-items: center;">
                                        <img style="border-radius:100%; width:42px; height:42px;" src="${user.imageUrl}" alt="user image" />
                                        <p style="overflow:auto; max-width: 75%; margin:0 !important;">${user.displayName ? user.displayName : user.firstName ? user.firstName : 'User'}</p>
                                        <span style="position: absolute;bottom: 0;left: 3px;" class="material-icons material-icons-sharp"><img style="width: 2rem;height: 2rem;" src="${url}" /></span>
                                    </div>`
                        })
                        if (index == reactions.length - 1) {
                            this._openDrawer(listItems);
                        } else {
                            callBack(reactions, index + 1, _setUsersList)
                        }
                    });
                } else if (index == reactions.length - 1) {
                    this._openDrawer(listItems);
                }
            }

            let options = { itemId: this.itemId, pageIndex: 0, pageSize: 50 }, totalUsersReactions = [];
            Reactions.get(options, (error, res) => {
                if (error) { }
                else if (res.result.length) {
                    totalUsersReactions = res.result;

                    let promiseArr = [], totalRecords = res.totalRecord, index = 0;
                    while (totalRecords > 50 && index < 4) {
                        promiseArr[index] = new Promise((resolve, reject) => {
                            Reactions.get(options, (error, res) => {
                                if (res.result.length) {
                                    totalUsersReactions = [...totalUsersReactions, ...res.result];
                                }
                                resolve(true);
                            })
                        })
                        index += 1;
                        options.pageIndex += 1;
                        totalRecords -= 50;
                    }

                    if (promiseArr.length > 1) {
                        Promise.all(promiseArr).then(() => {
                            _setUsersList(totalUsersReactions, 0, _setUsersList);
                        });
                    } else {
                        _setUsersList(totalUsersReactions, 0, _setUsersList);
                    }
                } else {
                    this._openDrawer([]);
                }
            })
        }

        _openDrawer(listItems) {
            buildfire.spinner.hide();
            buildfire.components.drawer.open(
                {
                    content: 'Reactions',
                    isHTML: true,
                    triggerCallbackOnUIDismiss: false,
                    autoUseImageCdn: true,
                    listItems
                },
                (err, result) => {
                    if (err) return console.error(err);
                }
            );
        }

        onReaction(event) { }

        static build(selector) {
            State.buildObserver(selector);
        }
    }

    window["reactionsComponentTestPart"] = { Reaction, Reactions, ReactionsSummary, ReactionsSummaries, ReactionsTypes };

    return ReactionComponent;
})();