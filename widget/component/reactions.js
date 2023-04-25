
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

        // options: {itemId, userId, reactionType}
        static _insert(options, callback) {
            let reaction = new Reaction({
                itemId: options.itemId,
                userId: options.userId,
                reactions: [{ reactionType: options.reactionType, createdOn: new Date() }]
            })
            reaction._buildfire.index = this.buildIndex(reaction);

            buildfire.appData.insert(
                reaction, this.TAG, false,
                (err, result) => {
                    if (err) {
                        return callback(err);
                    }
                    let groupName = ReactionsTypes.itemsReactionsGroupName[options.itemId];
                    buildfire.analytics.trackAction(groupName);
                    return callback(null, result);
                }
            );
        }

        // options: reaction, reactionType, operation, allowMultipleReactions
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

            if (!options.reactionType) {
                return callback("Invalid options, Missing reaction Type!");
            }

            let filter = {
                "_buildfire.index.string1": options.reaction.itemId + '-' + options.reaction.userId
            };
            let obj = {};

            if (options.allowMultipleReactions) {
                if (options.operation == "add" || options.operation == "toggle") {
                    obj = { $addToSet: { reactions: { reactionType: options.reactionType, createdOn: new Date() }, "_buildfire.index.array1": { string1: "reactionType-" + options.reaction.itemId + "-" + options.reactionType } } }
                } else if (options.operation == "remove") {
                    obj = { $pull: { reactions: { reactionType: options.reactionType } } }
                }
            } else {
                if (options.operation == "add" || options.operation == "toggle") {
                    obj = { $set: { reactions: [{ reactionType: options.reactionType, createdOn: new Date() }], "_buildfire.index.array1": [{ string1: "reactionType-" + options.reaction.itemId + "-" + options.reactionType }] } }
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

        // options: {itemId, userId, reactionId=null, reactionType}
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

        // options: {itemId, userId, reactionId=null, reactionType, allowMultipleReactions}
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
                return callback("Invalid options, Missing userId!");
            }
            if (!options.reactionType) {
                return callback("Invalid options, Missing reaction Type!");
            }

            this._search(options, (err, result) => {
                if (err) {
                    return callback(err)
                }

                if (result && result.data) {
                    if (result.data.reactions.find((reaction) => reaction.id === options.reactionType)) {
                        return callback(null, { status: 'noAction', data: result })
                    } else {
                        const reaction = result.data;
                        const oldReactionType = reaction.reactions.length ? reaction.reactions[0].type : "";
                        reaction.id = result.id;
                        let updateOptions = {
                            reaction: reaction,
                            reactionType: options.reactionType,
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

        // options: {itemId, userId, reactionId=null, reactionType}
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

            if (!options.reactionType) {
                return callback("Invalid options, Missing reaction Type!");
            }
            if (!options.userId) {
                return callback("Invalid options, Missing userId!");
            }

            this._search(options, (err, result) => {
                if (err) {
                    return callback(err)
                }
                if (result && result.data) {
                    if (result.data.reactions.find((reaction) => reaction.reactionType === options.reactionType)) {
                        return callback(null, { status: 'noAction', data: result })
                    } else {
                        const reaction = result.data;
                        reaction.id = result.id;
                        let updateOptions = {
                            reaction: reaction,
                            reactionType: options.reactionType,
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

        // options: {itemId, userId, reactionId=null, reactionType}
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
                return callback("Invalid options, Missing userId!");
            }
            if (!options.reactionType) {
                return callback("Invalid options, Missing reaction Type!");
            }

            this._search(options, (err, result) => {
                if (err) {
                    return callback(err)
                }

                if (result && result.data) {
                    if (!result.data.reactions.find((reaction) => reaction.reactionType === options.reactionType)) {
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
                                return callback(null, { status: 'deleted' });
                            });

                        } else { // remove only the reaction type from the array

                            let updateOptions = {
                                reaction: reaction,
                                reactionType: options.reactionType,
                                operation: "remove",
                                allowMultipleReactions: options.allowMultipleReactions
                            };

                            this._update(updateOptions, (err, result) => {
                                if (err) {
                                    return callback(err);
                                }
                                return callback(null, { status: 'deleted', data: result })
                            })
                        }
                    }
                } else {
                    return callback(null, { status: 'noAction' });
                }
            })
        }
        // options: { itemId, groupName, pageIndex, pageSize }
        static get(options, callback) { // fetch who reacted for specific item
            if (!callback || typeof callback !== 'function') {
                return console.error("callback must be a function!");
            }

            if (!options) {
                return callback("missing get options!");
            }
            let { itemId, groupName, pageIndex, pageSize } = options;

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
            ReactionsTypes.getReactionsTypes({ groupName, itemId }, (err, reactions) => {
                if (err) {
                    return callback(err)
                }
                let inArr = reactions.map(reaction => {
                    return `reactionType-${itemId}-${reaction.id}`
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
            });
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
                array1: data.reactions.map(reaction => ({ string1: "reactionType-" + data.itemId + "-" + reaction.reactionType }))
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
        // options = { itemId, reactionType, userId }
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
            if (!options.reactionType) {
                return callback("Invalid options, Missing increment reaction Type!");
            }
            if (!options.userId) {
                return callback("Invalid options, Missing increment userId!");
            }

            let { itemId, reactionType, userId } = options;
            this._search(itemId, (err, result) => {
                if (err) {
                    return callback(err);
                }
                if (!result || !result.length) {
                    let summery = new ReactionsSummary({
                        itemId,
                        reactions: [{ reactionType, count: 1, lastReactionBy: userId }]
                    })
                    summery._buildfire.index = this.buildIndex(summery);
                    this._create(summery, (err, res) => {
                        if (err) {
                            return callback(err);
                        }
                        return callback(null, { status: 'done' })
                    })
                } else {
                    let reactionData = result[0].data.reactions.find(reaction => reaction.reactionType == reactionType);
                    let filter = {}, obj = {};
                    if (reactionData) {
                        filter = {
                            "_buildfire.index.string1": itemId,
                            "reactions.reactionType": reactionType,
                        }
                        obj = { $inc: { "reactions.$.count": 1 }, $set: { "reactions.$.lastReactionBy": userId } }
                    } else {
                        filter = {
                            '_buildfire.index.string1': itemId,
                        }
                        obj = { $addToSet: { reactions: { reactionType, count: 1, lastReactionBy: userId }, "_buildfire.index.array1": { string1: 'reactionType-' + reactionType } } }
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
        // options = { itemId, reactionType }
        static decrement(options, callback) {
            if (!callback || typeof callback !== 'function') {
                return console.error("callback must be a function!");
            }
            if (!options) {
                return callback("Invalid options, Missing decrement options!");
            }
            if (!options.reactionType) {
                return callback("Invalid options, Missing decrement reaction Type!");
            }
            if (!options.itemId) {
                return callback("Invalid options, Missing decrement itemId!");
            }

            let { itemId, reactionType } = options;
            this._search(itemId, (err, result) => {
                if (err) {
                    return callback(err);
                }
                if (!result || !result.length) {
                    let summery = new ReactionsSummary({
                        itemId,
                        reactions: [{ reactionType, count: 0, lastReactionBy: null }]
                    })
                    summery._buildfire.index = this.buildIndex(summery);
                    this._create(summery, (err, res) => {
                        if (err) {
                            return callback(err);
                        }
                        return callback(null, { status: 'done' })
                    })
                } else {
                    let typeData = result[0].data.reactions.find(reaction => reaction.reactionType == reactionType);
                    let filter = {}, obj = {};
                    if (typeData) {
                        filter = {
                            "_buildfire.index.string1": itemId,
                            "reactions.reactionType": reactionType,
                        }
                        obj = { $inc: { "reactions.$.count": typeData.count > 0 ? -1 : 0 }, $set: { "reactions.$.lastReactionBy": null } }
                    } else {
                        filter = {
                            '_buildfire.index.string1': itemId,
                        }
                        obj = { $addToSet: { reactions: { reactionType, count: 0, lastReactionBy: null }, "_buildfire.index.array1": { string1: 'reactionType-' + reactionType } } }
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
                array1: data.reactions.map(reaction => ({ string1: 'reactionType-' + reaction.reactionType }))
            };

            return index;
        }
    }

    class ReactionsTypes {
        static itemsReactionsGroupName = {};
        static groups = null;

        static get TAG() {
            return "$$reactionsGroups";
        }

        // options = saved to futuer use
        static getReactionsGroups(options, callback) {
            if (!callback || typeof callback !== 'function') {
                return console.error("callback must be a function!");
            }

            buildfire.appData.get(this.TAG, (err, result) => {
                if (err) return callback(err)

                if (!result.data || !result.data.groups || !result.data.groups.length) {
                    console.error('No reaction groups added yet');
                    this.groups = [];
                    return callback(null, []);
                }

                this.groups = result.data.groups;
                return callback(null, this.groups);
            });
        }

        // options ={groupName, itemId}
        static getReactionsTypes(options, callback) {
            const { groupName, itemId } = options;

            if (!callback || typeof callback !== 'function') {
                return console.error("callback must be a function!");
            }

            if (!this.groups || !this.groups.length) {
                return callback("No Reactions Group Added yet");
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
                if (!group) {
                    group = this.groups[0];
                }
            } else {
                group = this.groups[0];
            }

            const allActiveReactions = group.reactions.filter(reaction => (reaction.isActive == true && reaction.selectedUrl && reaction.unSelectedUrl));
            if (!this.itemsReactionsGroupName[itemId]) {
                this.itemsReactionsGroupName[itemId] = groupName || group.name;
            }

            return callback(null, allActiveReactions);
        }

        // options ={reactionType, groupName, itemId}
        static validateReactionTypes(options, callback) {
            const { reactionType, itemId, groupName } = options;

            if (!reactionType) {
                return callback('Missing reaction Type');
            }
            if (!itemId) {
                return callback('Missing itemId');
            }

            this.getReactionsTypes({ itemId, groupName }, (err, res) => {
                if (err) {
                    return callback(err);
                }
                let validState = res.find(reaction => reaction.id == reactionType);

                if (validState) {
                    return callback(null, validState)
                }
                return callback('Invalid Reaction ID');
            });
        }
    }

    class DialogManager {
        static dialogContainer = document.createElement('div');

        static init(options, callback) {
            if (!callback || typeof callback !== 'function') {
                callback = (err, groupName) => {
                    if (err) return console.error(err);
                    return console.log('selected group changed to ' + groupName);
                }
            }

            this.show();
            this._addListeners(callback);

            if (!ReactionsTypes.groups) {
                ReactionsTypes.getReactionsGroups({}, (err, res) => {
                    if (err) return console.error(err);

                    if (res && res.length) {
                        this._printList(res);
                    } else {
                        this.updateContentState('empty');
                    }
                })
            } else if (ReactionsTypes.groups && ReactionsTypes.groups.length) {
                this._printList(ReactionsTypes.groups);
            } else {
                this.updateContentState('empty');
            }
        }

        static show() {
            this.dialogContainer.innerHTML = `
            <div modal-render="true" tabindex="-1" role="dialog" class="modal fade ng-isolate-scope in" uib-modal-animation-class="fade" modal-in-class="in" uib-modal-window="modal-window" window-class="" size="lg" index="0" animate="animate" modal-animation="true" style="z-index: 1050; display: block;background:#00000061;">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content" uib-modal-transclude="" style="height:70vh;">
                        <form class="submit-modal">
                            <div class="tag-search-dialog ng-scope" style="height:70vh;">
                                <div class="header clearfix border-bottom-grey">
                                    <h4 class="margin-zero" style="color:#5f5f5f;">Reactions</h4>
                                    <span class="icon icon-cross2 close-modal" ></span>
                                </div>
                                <div class="padded clearfix" style="height: calc(100% - 7.25rem);overflow: hidden;overflow-y: auto;">
                                    <div class="well no-plugins text-center" id="reactions-dialog-empty-container" style="height: 100%;display: flex;align-items: center;justify-content: center;">
                                        <h4>Loading...</h4>
                                    </div>
                                    <div class="" id="reactions-dialog-list-container">
                                    </div>
                                </div>
                                <div class="bottom border-top-grey clearfix">
                                    <button class="btn btn-success pull-right margin-left-fifteen save-modal" type="submit" disabled="disabled">
                                        Select
                                    </button>    
                                    <button class="btn btn-default pull-right cancel-modal">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>`;

            // buildfire.dialog.confirm({
            //     title:'Reactions',
            //     message:`<p></p>`,
            //     isMessageHTML:true,
            //     confirmButton:{
            //         text:'Select',
            //     }
            //   },
            //   (err, isConfirmed) => {
            //     if (err) console.error(err);
            
            //     if (isConfirmed) {
            //       //Go back
            //     } else {
            //       //Prevent action
            //     }
            //   }
            // );
            document.body.appendChild(this.dialogContainer);
        }

        static hide() {
            this.dialogContainer.remove();
        }

        static updateContentState(state) {
            let emptyContainer = this.dialogContainer.querySelector('#reactions-dialog-empty-container');
            let listContainer = this.dialogContainer.querySelector('#reactions-dialog-list-container');

            switch (state) {
                case 'empty':
                    emptyContainer.innerHTML = "<h4>You haven't added any reactions yet</h4>";
                    emptyContainer.classList.remove('hidden');
                    listContainer.classList.add('hidden');
                    break;
                case 'loading':
                    emptyContainer.innerHTML = "<h4>Loading...</h4>";
                    emptyContainer.classList.remove('hidden');
                    listContainer.classList.add('hidden');
                    break;
                default:
                    emptyContainer.classList.add('hidden');
                    listContainer.classList.remove('hidden');
                    break;
            }
        }

        static _printList(groups) {
            let listContainer = this.dialogContainer.querySelector('#reactions-dialog-list-container');

            let list = '';
            groups.forEach((group, idx) => {
                let reactions = '';
                group.reactions.forEach(reaction => {
                    let src = buildfire.imageLib.resizeImage(reaction.selectedUrl, { size: "half_width", aspect: "1:1" })
                    reactions += `<img style="width:24px; height:24px;" class="margin-right-five" src="${src}" />`;
                })
                let checked = false;
                if (State.selectedReactionsGroup && group.name == State.selectedReactionsGroup) {
                    checked = true;
                } else if (!State.selectedReactionsGroup && idx == 0) {
                    checked = true;
                }
                let li = `<tr style="border: 0.5px solid var(--c-gray3);">
                            <td style="width:0%;" class="padding-bottom-fifteen padding-top-fifteen padding-left-fifteen padding-right-fifteen">
                                <input ${checked ? "checked" : ""} name="selected-reaction-group" type="radio" value="${group.name}" id="${group.name}" style="width:20px;height:20px;" />
                            </td>
                            <td class="col-md-3 padding-bottom-fifteen padding-top-fifteen padding-left-zero padding-right-fifteen" >
                                <label class="margin-zero cursor-pointer" for="${group.name}" style="width:100%">${group.name}</label>
                            </td>
                            <td class="col-md-2 padding-bottom-fifteen padding-top-fifteen padding-left-fifteen padding-right-fifteen" >
                                <label class="margin-zero cursor-pointer" for="${group.name}" style="width:100%">${reactions}</label>
                            </td>
                        </tr>`;

                list += li;
            })

            listContainer.innerHTML = `<p style="font-weight: 700;color: var(--c-info);margin-left: 50px;">Group Name</p><table style="border: 0.5px solid var(--c-gray3);"><tbody>${list}</tbody></table>`;
            let inputs = listContainer.querySelectorAll('input');
            Array.from(inputs).forEach(input => {
                input.addEventListener('change', () => {
                    let submitBtn = this.dialogContainer.querySelector('.save-modal');
                    submitBtn.removeAttribute('disabled')
                })
            })
            this.updateContentState('list-printed')
        }

        static _addListeners(callback) {
            let closeBtn = this.dialogContainer.querySelector('.close-modal');
            let cancelBtn = this.dialogContainer.querySelector('.cancel-modal');
            let submitBtn = this.dialogContainer.querySelector('.submit-modal');

            closeBtn.addEventListener('click', () => {
                this.hide();
            });
            cancelBtn.addEventListener('click', () => {
                this.hide();
            });
            submitBtn.addEventListener('submit', (e) => {
                e.preventDefault();

                let elements = e.target['selected-reaction-group'];
                if (elements && elements.length) {
                    elements = Array.from(elements);
                } else {
                    elements = [elements];
                }

                let selectedRadio = elements.find(el => el.checked);
                let groupName = '', groupData = {};
                if (selectedRadio) {
                    groupName = selectedRadio.value;
                    groupData = ReactionsTypes.groups.find(group => group.name === groupName);
                    State.selectedReactionsGroup = groupName;
                } else {
                    groupName = ReactionsTypes.groups[0].name;
                    groupData = ReactionsTypes.groups[0].reactions;
                }

                callback(null, groupData);
                this.hide()
            });
        }
    }

    class State {
        // debounce getting item reactions to avoid multi-request to server
        static _itemIds = [];
        static _timer;
        static _observerContainers = [];
        static _observerTimer;
        static onLogin_onLogout_set = false;
        static selectedReactionsGroup = '';
        static user = null;

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
                    if (!this.user || !this.user._id) {
                        this.setCurrentUser((err, user) => {
                            if (err) return console.error(err);

                            if (user && user._id) {
                                Reactions.getByUserId(user._id, requestedIds, (error, result) => {

                                    if (error) console.error(error);
                                    if (result) {/* show users reactions on items */
                                        State._showUserReactions(result)
                                    }
                                })
                            }
                        })
                    } else {
                        Reactions.getByUserId(this.user._id, requestedIds, (error, result) => {

                            if (error) console.error(error);
                            if (result) {/* show users reactions on items */
                                State._showUserReactions(result)
                            }
                        })
                    }
                }
            }, 50)
        }

        static _showAllReactionCount(summaries, itemIds) {
            // print reactions count in the dom
            summaries.forEach(summery => {
                let containers = document.querySelectorAll(`[bf-reactions-itemid="${summery.data.itemId}"]`),
                    iconIds = [];
                containers.forEach(container => {
                    if (container) {
                        let groupName = container.getAttribute('bf-group-name');
                        let totalReactionCount = 0;
                        summery.data.reactions.forEach(reaction => {
                            ReactionsTypes.validateReactionTypes({ reactionType: reaction.reactionType, itemId: summery.data.itemId, groupName: groupName ? groupName : '' }, (err, res) => {
                                if (err) console.error(err);
                                else if (reaction.count > 0) {
                                    totalReactionCount += reaction.count;
                                    iconIds.push({ id: res.id, count: reaction.count });
                                }
                            })
                        });

                        let secondaryImages = container.querySelectorAll('[bf-reaction-image-id]');
                        let userReactionType = container.getAttribute('bf-user_react-type');
                        secondaryImages = Array.from(secondaryImages).filter(icon => {
                            let id = icon.getAttribute('bf-reaction-image-id');
                            let iconExist = iconIds.find(icon => icon.id == id);
                            if (iconExist) {
                                icon.setAttribute('bf-reaction-image-count', iconExist.count);
                            } else {
                                icon.setAttribute('bf-reaction-image-count', 0);
                            }
                            return (iconExist && userReactionType !== id);
                        })

                        secondaryImages.forEach((icon, idx) => {
                            icon.classList.remove('reactions-hidden');
                        })

                        let totalCountContainer = container.querySelector(`[bf-reactions-total-count]`);

                        if (totalCountContainer) {
                            totalCountContainer.setAttribute('bf-reactions-total-count', totalReactionCount);
                            totalCountContainer.innerHTML = this.correctCountNumbers(totalReactionCount);
                        }
                    }

                })
            })
            // show all count containers
            let countContainers = document.querySelectorAll("[bf-reactions-total-count]");
            countContainers.forEach(el => {
                el.style.visibility = 'visible';
            })
        }

        static correctCountNumbers(num) {
            let code = '';
            if (num >= 1000000000) {
                code = 'b';
                num = (num / 1000000000);
            }
            if (num >= 1000000) {
                code = 'm';
                num = (num / 1000000);
            }
            if (num >= 1000) {
                code = 'k';
                num = (num / 1000);
            }

            num = num.toString();
            if (num.includes('.')) {
                num = num.split('.')[0] + '.' + num.split('.')[1].substring(0, 1);
            }
            return num + code;
        }

        static _showUserReactions(reactions) {
            reactions.forEach(reaction => {
                // check if the reaction is valid or not
                if (reaction && reaction.data && reaction.data.itemId && reaction.data.reactions && reaction.data.reactions.length) {
                    ReactionsTypes.validateReactionTypes({ itemId: reaction.data.itemId, reactionType: reaction.data.reactions[0].reactionType, groupName: ReactionsTypes.itemsReactionsGroupName[reaction.data.itemId] || '' }, (e, r) => {
                        if (e) {
                            return console.error(e);
                        }
                        if (r) {
                            let containers = document.querySelectorAll(`[bf-reactions-itemid="${reaction.data.itemId}"]`);
                            containers.forEach(container => {
                                let mainButton = container.querySelector('[bf-reactions-btn]');
                                let userReactionIcon = container ? container.querySelector(`[bf-reaction-type="${reaction.data.reactions[0].reactionType}"]`) : null;

                                if (container && userReactionIcon) {
                                    container.setAttribute('bf-user_react-type', reaction.data.reactions[0].reactionType);
                                    container.setAttribute('bf-user_react-id', reaction.id);
                                    userReactionIcon.classList.add('reacted');
                                    userReactionIcon.style.color = userReactionIcon.getAttribute('bf-reactions-color');

                                    let userIcon = container.querySelector(`[bf-reaction-image-id="${reaction.data.reactions[0].reactionType}"]`);
                                    if (!userIcon.classList.contains('reactions-hidden')) {
                                        userIcon.classList.add('reactions-hidden');
                                    }

                                    mainButton.src = userReactionIcon.getAttribute('bf-reactions-reacted-url');
                                    mainButton.classList.add('reactions-show-main-icon');
                                    setTimeout(() => {
                                        mainButton.classList.remove('reactions-show-main-icon');
                                    }, 300)
                                }
                            })
                        }
                    })
                }
            })
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
                            groupName: node.getAttribute("bf-group-name"),
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

        static setCurrentUser(callback) {
            buildfire.auth.getCurrentUser((err, user) => {
                if (err || !user) {
                    this.user = {};
                } else if (user && user._id) {
                    this.user = user;
                }

                buildfire.auth.onLogin((loggedUser) => {
                    State.onLoginStateChanged(loggedUser);
                    this.user = loggedUser;
                }, true);

                buildfire.auth.onLogout(() => {
                    State.onLoginStateChanged(null);
                    this.user = {};
                }, true);

                return callback(err, this.user);
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

            ReactionComponent.getReactionsByGroupName(this.groupName, (err, res) => {
                if (err) {
                    return console.error(err);
                }
                this.reactionsArr = res.reactions;
                this._init();
            })
        }

        _init() {
            if (this.reactionsArr.length) {
                // crop reaction images 
                this.reactionsArr = this.reactionsArr.map(reaction => {
                    let selectedUrl = buildfire.imageLib.resizeImage(reaction.selectedUrl, { size: "half_width", aspect: "1:1" }),
                        unSelectedUrl = buildfire.imageLib.resizeImage(reaction.unSelectedUrl, { size: "half_width", aspect: "1:1" });

                    return ({ ...reaction, selectedUrl, unSelectedUrl });
                })
                this._buildComponent();
                State.debounce({ itemId: this.itemId, getUsersData: true, getSummariesData: true });
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
                                        <img style="animation-duration:${idx / 10 + 0.1}s;" bf-reactions-non-reacted-url="${reaction.unSelectedUrl}" bf-reactions-reacted-url="${reaction.selectedUrl}" bf-reactions-url="${reaction.url}" bf-reaction-type="${reaction.id}" class="reactions-clickable-image reactions-icon-animation" src="${reaction.selectedUrl}" />
                                    </div>`
            });
            this.container.setAttribute('bf-reactions-itemid', this.itemId);
            this.container.setAttribute('bf-user_react-type', ''); // reaction id from the reaction list
            this.container.setAttribute('bf-user_react-id', '');   // selected reaction id that autogenerated when the user selected
            this.container.classList.add('reactions-main-container');
            let secondaryIcons = ``;

            this.reactionsArr.forEach((icon, idx) => {
                secondaryIcons += `<img bf-reaction-image-id="${icon.id}" style="z-index:${9 - idx}" class="reactions-hidden reactions-secondary-icon" src="${icon.selectedUrl}" />`
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
                    let reactionIcons = this.container.querySelectorAll('[bf-reaction-type]');
                    let reacted = this.container.querySelector('.reacted');
                    if (reacted) {
                        this._validateUserAndReact(reacted.getAttribute('bf-reaction-type'), reacted);
                    } else {
                        this._validateUserAndReact(reactionIcons[0].getAttribute('bf-reaction-type'), reactionIcons[0]);
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

            let reactionIcons = this.container.querySelectorAll('[bf-reaction-type]');
            reactionIcons.forEach(icon => {
                icon.addEventListener('click', (event) => {
                    // prevent download image on iOS
                    if (event.target.tagName.toLowerCase() === 'img') {
                        event.preventDefault();
                    }
                    this._validateUserAndReact(icon.getAttribute('bf-reaction-type'), icon);
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
            if (State.user && State.user._id) {
                this._reactionHandler(newReactionUUID, icon, State.user._id);
            } else {
                buildfire.auth.login({}, (err, user) => {
                    if (user && user._id) {
                        State.user = user;
                        this._reactionHandler(newReactionUUID, icon, user._id);
                    }
                });
            }
        }

        _reactionHandler(newReactionUUID, icon, userId) {
            let userReactUUID = this.container.getAttribute('bf-user_react-type');

            let selectedReaction = {
                reactionType: newReactionUUID,
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

            this._renderReactionIconsBox({ newIcon: icon, fromQueue })

            let reactOptions = { itemId: selectedReaction.itemId, userId, reactionType: selectedReaction.reactionType, allowMultipleReactions: this.allowMultipleReactions }
            if (this.isPending) {
                this.nextRequest = { type: 'add', options }
            } else {
                this.isPending = true;
                Reactions.react(reactOptions, (error, result) => {
                    if (error) {
                        this._renderReactionIconsBox({ oldIcon: icon });
                        return console.error('Error while adding new Reaction: ' + error)
                    } else if (result) {
                        if (result.status === 'added') {
                            this.container.setAttribute('bf-user_react-id', result.data.id);
                            let options = { reactionType: selectedReaction.reactionType, itemId: selectedReaction.itemId, userId }
                            ReactionsSummaries.increment(options, (err, res) => {
                                this._checkPendingRequest();

                                if (err) return console.error(err);
                                if (res.status === 'done') {

                                } else if (res.status === 'noAction') {
                                    // nothing will be happened
                                }
                            });
                        } else if (result.status === 'updated') {
                            ReactionsSummaries.decrement({ itemId: selectedReaction.itemId, reactionType: result.oldData.reactions[0].reactionType }, (err, res) => {
                                if (err) return console.error(err)
                            });

                            let incrementOptions = { reactionType: selectedReaction.reactionType, itemId: selectedReaction.itemId, userId }
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
                        this.onReaction({ status: 'add', reactionID: selectedReaction.reactionType, itemId: selectedReaction.itemId, userId })
                    }
                });
            }
        }

        _toggleReaction(options) {
            let { icon, userReactUUID, userId, selectedReaction, fromQueue } = options;

            let itemId = selectedReaction.itemId
            this._renderReactionIconsBox({ fromQueue, newIcon: icon, oldIcon: this.container.querySelector(`[bf-reaction-type="${userReactUUID}"]`) });

            if (this.isPending) {
                this.nextRequest = { type: 'update', options }
            } else {
                this.isPending = true;
                let reactOptions = { itemId, userId, reactionType: selectedReaction.reactionType, reactionId: selectedReaction.reactionId, allowMultipleReactions: this.allowMultipleReactions }
                Reactions.unReactReact(reactOptions, (error, result) => {
                    if (error) {
                        this._renderReactionIconsBox({ oldIcon: icon, newIcon: this.container.querySelector(`[bf-reaction-type="${userReactUUID}"]`) });
                        return console.error('Error while updated the Reaction: ' + error)
                    } else if (result) {
                        // reaction updated successfully 
                        if (result.status === 'updated') {
                            // decrement for the old type and increment the new one
                            ReactionsSummaries.decrement({ itemId, reactionType: userReactUUID }, (err, res) => {
                                this._checkPendingRequest();
                                if (err) return console.error(err)
                            });
                            ReactionsSummaries.increment({ itemId, reactionType: selectedReaction.reactionType, userId }, (err, res) => {
                                this._checkPendingRequest();
                                if (err) return console.error(err)
                            });
                        } else if (result.status === 'added') {
                            this.container.setAttribute('bf-user_react-id', result.data.id);
                            ReactionsSummaries.increment({ itemId, reactionType: selectedReaction.reactionType, userId }, (err, res) => {
                                this._checkPendingRequest();
                                if (err) return console.error(err)
                            });
                            // nothing will be happened
                        } else if (result.status === 'noAction') {
                            this._checkPendingRequest();
                            // nothing will be happened
                        }
                        this.onReaction({ status: 'update', reactionType: selectedReaction.reactionType, itemId, userId })
                    }
                })
            }
        }

        _deselectReaction(options) {
            let { icon, userReactUUID, userId, selectedReaction, fromQueue } = options;

            let reactionId = selectedReaction.reactionId;
            let itemId = selectedReaction.itemId;
            let reactionType = userReactUUID;

            let reactOptions = { itemId, userId, reactionId, reactionType, allowMultipleReactions: this.allowMultipleReactions }

            this._renderReactionIconsBox({ oldIcon: icon, fromQueue });

            if (this.isPending) {
                this.nextRequest = { type: 'delete', options }
            } else {
                this.isPending = true;
                Reactions.unReact(reactOptions, (error, result) => {
                    if (error) {
                        this._renderReactionIconsBox({ newIcon: icon });
                        return console.error('Error while deleting the Reaction: ' + error)
                    } else if (result) {
                        if (result.status === 'deleted') {
                            this.container.setAttribute('bf-user_react-id', '');
                            /* Reaction deleted successfully */
                            ReactionsSummaries.decrement({ itemId, reactionType }, (err, res) => {
                                this._checkPendingRequest();
                                if (err) return console.error(err)
                            });
                        } else if (result.status === 'noAction') {
                            this._checkPendingRequest();
                            // nothing will be happened
                        }
                        this.onReaction({ status: 'delete', reactionType, itemId, userId })
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
        // render
        _renderReactionIconsBox(options) {
            let { newIcon, oldIcon, fromQueue } = options;

            this._hideReactionIcons();

            if (!fromQueue) {
                let mainButton = this.container.querySelector('[bf-reactions-btn]');

                if (oldIcon) {
                    oldIcon.classList.remove('reacted');
                    this.container.setAttribute('bf-user_react-type', '');
                    this.container.setAttribute('bf-user_react-id', '');

                    let userIcon = this.container.querySelector(`[bf-reaction-image-id="${oldIcon.getAttribute('bf-reaction-type')}"]`);
                    let oldIconCount = parseInt(userIcon.getAttribute("bf-reaction-image-count"));
                    userIcon.setAttribute("bf-reaction-image-count", oldIconCount - 1);
                    if (userIcon.classList.contains('reactions-hidden') && oldIconCount >= 2) {
                        userIcon.classList.remove('reactions-hidden');
                    }
                }

                if (newIcon) {
                    newIcon.classList.add('reacted');
                    this.container.setAttribute('bf-user_react-type', newIcon.getAttribute('bf-reaction-type'));
                    mainButton.src = newIcon.getAttribute('bf-reactions-reacted-url');
                    mainButton.classList.add('reactions-show-main-icon');
                    setTimeout(() => {
                        mainButton.classList.remove('reactions-show-main-icon');
                    }, 300)

                    let userIcon = this.container.querySelector(`[bf-reaction-image-id="${newIcon.getAttribute('bf-reaction-type')}"]`);
                    if (!userIcon.classList.contains('reactions-hidden')) {
                        userIcon.classList.add('reactions-hidden');
                    }

                    let oldIconCount = parseInt(userIcon.getAttribute("bf-reaction-image-count"));
                    userIcon.setAttribute("bf-reaction-image-count", oldIconCount + 1);
                }

                let reactionsCountContainer = this.container.querySelector('[bf-reactions-total-count]');
                if (newIcon && !oldIcon && reactionsCountContainer) {
                    let reactionsCount = reactionsCountContainer.getAttribute('bf-reactions-total-count');
                    let newCount = parseInt(reactionsCount) + 1;
                    newCount = newCount >= 0 ? newCount : 0
                    reactionsCountContainer.setAttribute('bf-reactions-total-count', newCount);
                    reactionsCountContainer.innerHTML = State.correctCountNumbers(newCount);
                }

                if (!newIcon && oldIcon) {
                    let reactionsCount = reactionsCountContainer.getAttribute('bf-reactions-total-count');
                    let newCount = parseInt(reactionsCount) - 1;
                    newCount = newCount >= 0 ? newCount : 0
                    reactionsCountContainer.setAttribute('bf-reactions-total-count', newCount);
                    reactionsCountContainer.innerHTML = State.correctCountNumbers(newCount);

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

                let reactionObject = this.reactionsArr.find(itemReaction => itemReaction.id === reaction.data.reactions[0].reactionType);
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

            let options = { itemId: this.itemId, groupName: this.groupName, pageIndex: 0, pageSize: 50 }, totalUsersReactions = [];
            Reactions.get(options, (error, res) => {
                if (error) { }
                else if (res.result.length) {
                    totalUsersReactions = res.result;

                    let promiseArr = [], totalRecords = res.totalRecord, index = 0;
                    // Math.round(((Math.min(totalRecords,250) - 50) / 50))
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

        static getReactionsByGroupName(groupName, callback) {
            if (!callback || typeof callback !== 'function') {
                return console.error('callback must be a function');
            }
            let groupData;
            if (!ReactionsTypes.groups) {
                ReactionsTypes.getReactionsGroups({}, (err, res) => {
                    if (err) return console.error(err);
                    if (res && res.length) {
                        if (groupName) {
                            groupData = res.find(group => group.name.toLowerCase() === groupName.toLowerCase());
                        }
                        if (!groupData && res[0]) {
                            groupData = res[0];
                        }
                        return callback(null, groupData);
                    } else {
                        return callback('No reaction groups added yet');
                    }
                })
            } else if (ReactionsTypes.groups && ReactionsTypes.groups.length) {
                if (groupName) {
                    groupData = ReactionsTypes.groups.find(group => group.name.toLowerCase() === groupName.toLowerCase());
                }
                if (!groupData) {
                    groupData = ReactionsTypes.groups[0];
                }
                return callback(null, groupData);
            } else {
                return callback('No reaction groups added yet');
            }
        }

        onReaction(event) { }

        static build(selector) {
            State.buildObserver(selector);
        }

        // CP Side - Methods
        static openReactionGroupsDialog(options, callback) {
            buildfire.getContext((e, r) => {
                if (e) {
                    return console.error(e);
                } else if (r && r.type == "control") {
                    DialogManager.init(options, callback);
                } else {
                    console.error('reaction dialog should be called in CP-side');
                }
            })
        }
        static getSelectedReactionsGroup() {
            this.getReactionsByGroupName(State.selectedReactionsGroup, (err,groupData)=>{
                if(err) return console.error(err);
                return groupData;
            })
        }
        static initReactionsGroupSelector(options) {
            const { selector, groupName } = options;
            let container = document.querySelector(selector);
            if (container) {
                this.getReactionsByGroupName(groupName, (err, res) => {
                    if (err) {
                        return console.error(err);
                    }
                    this._printReactionsSelector(container, res);
                })
            } else {
                return console.error('Invalid selector');
            }
        }
        static _printReactionsSelector(container, groupData) {
            State.selectedReactionsGroup = groupData.name;
            let iconsElements = '';
            if (groupData.reactions && groupData.reactions.length) {
                groupData.reactions.forEach(icon => {
                    let selectedUrl = buildfire.imageLib.resizeImage(icon.selectedUrl, { size: "half_width", aspect: "1:1" });
                    iconsElements += `
                            <span class="margin-right-five" style="display: inline-block;width:1.5rem;height:1.5rem;" >
                                <img src="${selectedUrl}" style="width:1.5rem;height:1.5rem;" />
                            </span>`
                })
            }
            container.innerHTML = `<div class="border-radius-four cursor-pointer" style="width:100%;height:3.75rem;border:1px solid var(--c-gray3);display:flex;">
                <div style="height: 100%;display: flex;flex-direction: column;justify-content: center;" class="col-md-9">
                    <span style="color: var(--c-info);">${groupData.name}</span>
                    <div>${iconsElements}</div>
                </div>
                <div style="height:100%;height: 100%;display: flex;align-items: center;justify-content: flex-end;" class="col-md-3">
                    <span class="btn--icon icon icon-pencil cursor-pointer" style="font-size: 1.25rem;padding: 0.625rem;"></span>
                </div>
            </div>`;

            container.addEventListener('click', () => {
                DialogManager.init({}, (err, res) => {
                    if (err) {
                        return console.error(err);
                    }
                    if (res) {
                        this._printReactionsSelector(container, res);
                    } else {
                        this._printReactionsSelector(container, { name: 'No Reactions added yet' });
                    }
                    this.onSelectedReactionsGroupChange(res)
                });
            })
        }

        // CP Side - Events
        static onSelectedReactionsGroupChange(data = {}) {
            console.log('selected group = ', data);
            return data;
        }
    }

    // sync with reactions group plugin
    buildfire.messaging.onReceivedMessage = (message) => {
        if(message.cmd === 'reactions group plugin'){
            let syncedItemId = "2457ffb3-11a1-4e3f-ba46-b1cdaea055c5";
            let { openReactionList, groupName, groups } = message;

            if (groupName) {
                ReactionsTypes.groups = groups;
                ReactionsTypes.itemsReactionsGroupName[syncedItemId] = groupName;
    
                document.getElementById('main-reactions-container').innerHTML = `<div bf-group-name=${groupName} bf-reactions-itemid=${syncedItemId}></div>`;
            }
    
            setTimeout(() => {
                let iconsContainer = document.querySelector('.reactions-icon-container');
                ReactionsTypes.getReactionsTypes({ itemId:syncedItemId, groupName }, (err, reactions) => {
                    if (err) {
                        return console.error(err);
                    }
                    if (openReactionList && reactions.length > 1 && iconsContainer) {
                        iconsContainer.classList.remove('reactions-hidden');
                    }
                });
            }, 500)
        }
    };
    window["reactionsComponentTest"] = { Reaction, Reactions, ReactionsSummary, ReactionsSummaries, ReactionsTypes };

    return ReactionComponent;
})();