'use strict';

const State = {
    warn: false,
    activeGroup: {},
    groupIndex: 0,
    addNewGroup: false,
    activePage: '',
}

const initialData = {
    _initialGroups: {
        'General': [
            {
                "selectedUrl": "https://s3-us-west-2.amazonaws.com/imageserver.prod/1681345747513-09587863467627367/14f7d6c0-d993-11ed-925e-5b007d5e8eea.png",
                "unSelectedUrl": "https://s3-us-west-2.amazonaws.com/imageserver.prod/1681345747513-09587863467627367/14f7afb0-d993-11ed-86f6-f3f0569303b6.png",
            },
            {
                "selectedUrl": "https://s3-us-west-2.amazonaws.com/imageserver.prod/1681345747513-09587863467627367/ddf224d0-da0c-11ed-86f6-f3f0569303b6.png",
                "unSelectedUrl": "https://s3-us-west-2.amazonaws.com/imageserver.prod/1681345747513-09587863467627367/d6af5170-da0c-11ed-925e-5b007d5e8eea.png",
            },
            {
                "selectedUrl": "https://s3-us-west-2.amazonaws.com/imageserver.prod/1681345747513-09587863467627367/038a2ad0-da0d-11ed-868e-d7be3e8404e8.png",
                "unSelectedUrl": "https://s3-us-west-2.amazonaws.com/imageserver.prod/1681345747513-09587863467627367/0388f250-da0d-11ed-925e-5b007d5e8eea.png",
            },
            {
                "selectedUrl": "https://s3-us-west-2.amazonaws.com/imageserver.prod/1681345747513-09587863467627367/f262d720-da0c-11ed-925e-5b007d5e8eea.png",
                "unSelectedUrl": "https://s3-us-west-2.amazonaws.com/imageserver.prod/1681345747513-09587863467627367/f25edf80-da0c-11ed-86f6-f3f0569303b6.png",
            },
            {
                "selectedUrl": "https://s3-us-west-2.amazonaws.com/imageserver.prod/1681345747513-09587863467627367/eb18d7d0-da0c-11ed-868e-d7be3e8404e8.png",
                "unSelectedUrl": "https://s3-us-west-2.amazonaws.com/imageserver.prod/1681345747513-09587863467627367/eb15ca90-da0c-11ed-925e-5b007d5e8eea.png",
            },
        ],
        'Like': [
            {
                selectedUrl: 'https://s3-us-west-2.amazonaws.com/imageserver.prod/1678747242812-005304926216515837/9dd92430-d402-11ed-9bf8-39263e093466.png',
                unSelectedUrl: 'https://s3-us-west-2.amazonaws.com/imageserver.prod/1678747242812-005304926216515837/a55a6020-d402-11ed-b497-f5a0916fe7bb.png',
            }
        ],
        'Smiley': [
            {
                "selectedUrl": "https://s3-us-west-2.amazonaws.com/imageserver.prod/1681345747513-09587863467627367/ddf224d0-da0c-11ed-86f6-f3f0569303b6.png",
                "unSelectedUrl": "https://s3-us-west-2.amazonaws.com/imageserver.prod/1681345747513-09587863467627367/d6af5170-da0c-11ed-925e-5b007d5e8eea.png",
            },
            {
                "selectedUrl": "https://s3-us-west-2.amazonaws.com/imageserver.prod/1681345747513-09587863467627367/ddf977d0-da0c-11ed-86f6-f3f0569303b6.png",
                "unSelectedUrl": "https://s3-us-west-2.amazonaws.com/imageserver.prod/1681345747513-09587863467627367/d6b740b0-da0c-11ed-86f6-f3f0569303b6.png",
            },
            {
                "selectedUrl": "https://s3-us-west-2.amazonaws.com/imageserver.prod/1681345747513-09587863467627367/ddf58030-da0c-11ed-868e-d7be3e8404e8.png",
                "unSelectedUrl": "https://s3-us-west-2.amazonaws.com/imageserver.prod/1681345747513-09587863467627367/d6b1e980-da0c-11ed-868e-d7be3e8404e8.png",
            },
            {
                "selectedUrl": "https://s3-us-west-2.amazonaws.com/imageserver.prod/1681345747513-09587863467627367/dde9c060-da0c-11ed-925e-5b007d5e8eea.png",
                "unSelectedUrl": "https://s3-us-west-2.amazonaws.com/imageserver.prod/1681345747513-09587863467627367/d6ab0bb0-da0c-11ed-868e-d7be3e8404e8.png",
            },
            {
                "selectedUrl": "https://s3-us-west-2.amazonaws.com/imageserver.prod/1681345747513-09587863467627367/ddf02900-da0c-11ed-868e-d7be3e8404e8.png",
                "unSelectedUrl": "https://s3-us-west-2.amazonaws.com/imageserver.prod/1681345747513-09587863467627367/d6ac9250-da0c-11ed-86f6-f3f0569303b6.png",
            }
        ]
    },

    setInitialGroups() {
        buildfire.auth.getCurrentUser((err, user) => {
            if (err || !user) {
                GroupsList.updateEmptyState("empty");
                return console.error(err || 'No User found');
            }
            if (user && user.userId) {
                let groups = [];

                for (const groupName in this._initialGroups) {
                    let groupData = new Group({
                        name: groupName,
                        reactions: this._initialGroups[groupName].map(reaction => {
                            return new ReactionsTypes({
                                id: uuidv4(),
                                selectedUrl: reaction.selectedUrl,
                                unSelectedUrl: reaction.unSelectedUrl,
                                isActive: true
                            })
                        }),
                        createdBy: user.userId,
                        lastUpdatedBy: user.userId
                    });
                    groups.push(groupData);
                }

                let groupsData = new ReactionsGroup({ groups });
                APIHandlers.insertInitialGroups(groupsData);
            }
        })
    }
}

const APIHandlers = {
    savingTimer: null, sendingTimer: null,

    insertInitialGroups(groupsData){
        ReactionsGroups.insert(groupsData, (err, res) => {
            if (err) {
                GroupsList.updateEmptyState("empty");
                return console.error(err);
            }

            GroupsList.groups = groupsData.groups;
            GroupsList.list.init(groupsData.groups);
            GroupsList.updateEmptyState("list printed");

            this.sendToWidget(false, GroupsList.groups[0].reactions);
        })
    },

    updateGroups() {
        clearTimeout(this.savingTimer);
        this.savingTimer = setTimeout(() => {
            GroupsList.groups = GroupsList.list.sortableList.items;
            // update the db data
            let reactionsGroup = new ReactionsGroup({ groups: GroupsList.groups });
            ReactionsGroups.update(reactionsGroup, (err, res) => {
                if (err) { console.log(err) }
                State.addNewGroup = false;

                if (State.activePage !== 'groupList') {
                    Views.navigate('groupList');
                }
                let groups = GroupsList.groups, reactions = [];
                if (groups && groups[0] && groups[0].reactions) {
                    reactions = groups[0].reactions;
                }
                this.sendToWidget(false, reactions);
            })
        }, 300)
    },

    getGroups() {
        ReactionsGroups.get({}, (err, res) => {
            if (err) return console.error(err);

            if (!res || !res.groups) {
                GroupsList.groups = [];
                GroupsList.updateEmptyState("empty");

                let loadSampleDataOptions = {
                    title: `Sample Data`,
                    message: `let's load some sample reactions`,
                    confirmButton: { text: "Load Sample Data", type: "success" },
                }

                buildfire.dialog.confirm(loadSampleDataOptions, (e, isConfirmed) => {
                    if (e) console.error(e);

                    if (isConfirmed) {
                        GroupsList.updateEmptyState("loading");
                        initialData.setInitialGroups();
                    }
                    else {
                        GroupsList.updateEmptyState("empty");
                        GroupsList.list.init([]);
                    }
                });
            } else if (!res.groups.length) {
                GroupsList.groups = [];
                GroupsList.list.init([]);
                return GroupsList.updateEmptyState("empty");
            } else {
                GroupsList.groups = res.groups;
                GroupsList.list.init(res.groups);

                return GroupsList.updateEmptyState("list printed");
            }
        })
    },

    /**
     * @param {boolean} openReactionList 
     * @param {Array} reactions 
     */
    sendToWidget(openReactionList, reactions) {
        clearTimeout(this.sendingTimer);
        this.sendingTimer = setTimeout(() => {
            let groups = GroupsList.groups;
            if (!groups.length) {
                groups = [{
                    name: ReactionsList.uiElements.inputGroupName ? ReactionsList.uiElements.inputGroupName.value : '',
                    reactions: reactions
                }]
            }
            buildfire.messaging.sendMessageToWidget({
                openReactionList, reactions, groups
            });
        }, 300);
    }
}

const GroupsList = {
    uiElements: {}, groups: null, list: null,

    init() {
        this._initUIElements();
        this._addListeners();

        this._initList();
    },

    _addListeners() {
        this.uiElements.addBtn.addEventListener('click', () => {
            State.addNewGroup = true;
            Views.navigate('reactionList', { newGroup: true });
        })
    },

    _initList() {
        State.addNewGroup = false;

        this.list = new groupListUI('#sortableList');
        this.updateEmptyState("loading");

        if (!this.groups) {
            ReactionsGroups.get({}, (err, res) => {
                if (err) { }

                APIHandlers.getGroups();
            })
        } else {
            if (this.groups.length) {
                this.updateEmptyState("list printed");
                this.list.init(this.groups);
                APIHandlers.sendToWidget(false, this.groups[0].reactions);
            } else {
                this.list.init([]);
                this.updateEmptyState("empty");
                APIHandlers.sendToWidget(false, []);
            }
        }
    },

    _initUIElements() {
        this.uiElements = {
            addBtn: document.getElementById("add-group-btn"),
            emptyState: document.getElementById('emptyState'),
            sortableList: document.getElementById('sortableList'),
        }
    },

    updateEmptyState(state) {
        if (state == "loading") {
            this.uiElements.emptyState.innerHTML = `<div class="empty-state"><h4> Loading... </h4></div>`;
            this.uiElements.emptyState.classList.remove('hidden');
            this.uiElements.sortableList.classList.add('hidden');
        } else if (state == "empty") {
            this.uiElements.emptyState.innerHTML = `<div class="empty-state"><h4>You haven't added anything yet</h4></div>`;
            this.uiElements.emptyState.classList.remove('hidden');
            this.uiElements.sortableList.classList.add('hidden');
        } else {
            this.uiElements.emptyState.classList.add('hidden');
            this.uiElements.sortableList.classList.remove('hidden');
        }
    }
}

const ReactionsList = {
    uiElements: {}, reactions: [], list: null,

    init(options) {
        this._initUIElements();
        this._buildBreadCrumbs(['Reactions', options.name ? options.name : 'New Group']);
        this._addListeners();

        this._initList(options);
        if (options.name) {
            State.activeGroup = JSON.parse(JSON.stringify(options));

            State.groupIndex = GroupsList.groups.findIndex(item => {
                return item.name === options.name;
            });
        }

        APIHandlers.sendToWidget(true, this.reactions);
    },

    _addListeners() {
        this.uiElements.cancel.addEventListener('click', () => {
            if (!State.warn) return Views.navigate('groupList');
            else {
                let cancelOptions = {
                    title: `Unsaved Changes`,
                    message: `This page contains unsaved changes. Do you still wish to leave the page?`,
                    confirmButton: { text: "Leave Page", type: "danger" },
                }
                buildfire.dialog.confirm(cancelOptions, (e, isConfirmed) => {
                    if (e) console.error(e);

                    if (isConfirmed) {
                        if (e) console.error(e);
                        if (isConfirmed) {
                            GroupsList.groups[State.groupIndex] = JSON.parse(JSON.stringify(State.activeGroup));

                            let groups = GroupsList.groups, reactions = [];
                            if (groups && groups[0] && groups[0].reactions) {
                                reactions = groups[0].reactions;
                            }
                            APIHandlers.sendToWidget(false, reactions);

                            return Views.navigate('groupList');
                        }
                    }
                });
            }
        });

        this.uiElements.inputGroupName.addEventListener('keyup', (e) => {
            State.warn = true;
            this.toggleSaveButton();
        })

        this.uiElements.addBtn.addEventListener('click', () => {
            if (this.list.sortableList.items.length < 5) {
                State.warn = true;
                clearTimeout(this.savingTimer);
                this.savingTimer = setTimeout(() => {
                    this.updateEmptyState("list printed");

                    const id = uuidv4();
                    const newReaction = new ReactionsTypes({ id });
                    this.list.addItem(newReaction);
                    this.toggleSaveButton();
                }, 100);
            }
        })

        this.uiElements.save.addEventListener('click', () => {
            if (State.warn) {
                State.warn = false;

                if (!this.uiElements.inputGroupName.value) { return }
                let repeatGroupName = false;
                GroupsList.groups.forEach((group, idx) => {
                    if ((idx !== State.groupIndex && !repeatGroupName && !State.addNewGroup) || (State.addNewGroup && !repeatGroupName)) {
                        repeatGroupName = this.uiElements.inputGroupName.value.toLowerCase() === group.name.toLowerCase();
                    }
                })
                if (repeatGroupName) {
                    State.warn = true;
                    this.uiElements.inputGroupName.classList.add('input-error');
                    this.uiElements.groupNameError.classList.remove('hidden');
                    return false;
                }

                buildfire.auth.getCurrentUser((err, user) => {
                    if (err || !user) {
                        return console.error(err || 'No user found');
                    }

                    if (State.addNewGroup) {
                        let newGroup = new Group({
                            createdBy: user.userId,
                            lastUpdatedBy: user.userId,
                            name: this.uiElements.inputGroupName.value,
                            reactions: this.list.sortableList.items
                        })
                        GroupsList.list.addItem(newGroup);
                    } else {
                        let updatedGroup = new Group({
                            ...State.activeGroup,
                            lastUpdatedBy: user.userId,
                            name: this.uiElements.inputGroupName.value,
                            reactions: this.list.sortableList.items
                        })
                        GroupsList.list.updateItem(updatedGroup, State.groupIndex)
                    }
                    APIHandlers.updateGroups();
                });
            }
        })
    },

    _initList(options) {
        let groupName = options.name || '';
        this.uiElements.inputGroupName.value = groupName

        this.list = new reactionListUI('#reactionsSortableList');
        this.updateEmptyState("loading");

        this.reactions = options.reactions || [];
        this.list.init(this.reactions);

        if (!this.reactions.length) return this.updateEmptyState("empty");
        else this.updateEmptyState("list printed");

        if (this.reactions.length === 5) this.uiElements.addBtn.setAttribute('disabled', 'disabled');
    },

    _initUIElements() {
        this.uiElements = {
            breadcrumbsSelector: document.getElementById('breadcrumbs'),
            addBtn: document.getElementById("add-reaction-btn"),
            emptyState: document.getElementById('reactionsEmptyState'),
            sortableList: document.getElementById('reactionsSortableList'),
            inputGroupName: document.getElementById('groupName'),
            groupNameError: document.getElementById('group-name-error'),
            cancel: document.getElementById('cancelGroup'),
            save: document.getElementById('saveGroup'),
        }
    },

    _buildBreadCrumbs(pages) {
        this.uiElements.breadcrumbsSelector.innerHTML = "";
        this.uiElements.breadcrumbsSelector.classList.remove('hidden');
        pages.forEach((breadCrumb, index) => {
            const listItem = document.createElement('li');
            if (index < pages.length - 1) {
                listItem.innerHTML = `<a>${breadCrumb}</a>`;

                listItem.onclick = () => {
                    if (!State.warn) {
                        let groups = GroupsList.groups, reactions = [];
                        if (groups && groups[0] && groups[0].reactions) {
                            reactions = groups[0].reactions;
                        }
                        APIHandlers.sendToWidget(false, reactions);

                        return Views.navigate('groupList');
                    }
                    let navigateOptions = {
                        title: `Unsaved Changes`,
                        message: `This page contains unsaved changes. Do you still wish to leave the page?`,
                        confirmButton: { text: "Leave Page", type: "danger" },
                    }

                    buildfire.dialog.confirm(navigateOptions,
                        (e, isConfirmed) => {
                            if (e) console.error(e);
                            if (isConfirmed) {
                                GroupsList.groups[State.groupIndex] = JSON.parse(JSON.stringify(State.activeGroup));
                                
                                let groups = GroupsList.groups, reactions = [];
                                if (groups && groups[0] && groups[0].reactions) {
                                    reactions = groups[0].reactions;
                                }
                                APIHandlers.sendToWidget(false, reactions);

                                Views.navigate('groupList');
                            }
                        }
                    );
                };
            } else {
                listItem.innerHTML = `<span>${breadCrumb}</span>`;
            }
            this.uiElements.breadcrumbsSelector.appendChild(listItem);
        });
    },

    toggleSaveButton(disabled = false) {
        if (disabled) return this.uiElements.save.setAttribute('disabled', 'disabled');
        let validGroupName = this.uiElements.inputGroupName.value;
        let validReactionsIcons = true;
        if (this.reactions.length) {
            this.reactions.forEach(reaction => {
                if (!reaction.selectedUrl || !reaction.unSelectedUrl) validReactionsIcons = false;
            });
        } else {
            validReactionsIcons = false;
        }

        if (validGroupName && validReactionsIcons) this.uiElements.save.removeAttribute('disabled');
        else this.uiElements.save.setAttribute('disabled', 'disabled');

        if (this.reactions.length === 5) this.uiElements.addBtn.setAttribute('disabled', 'disabled');
        else this.uiElements.addBtn.removeAttribute('disabled');

        APIHandlers.sendToWidget(true, this.reactions);
    },

    updateEmptyState(state) {
        if (state == "loading") {
            this.uiElements.emptyState.innerHTML = `<div class="empty-state"><h4> Loading... </h4></div>`;
            this.uiElements.emptyState.classList.remove('hidden');
            this.uiElements.sortableList.classList.add('hidden');
        } else if (state == "empty") {
            this.uiElements.emptyState.innerHTML = `<div class="empty-state"><h4>You haven't added anything yet</h4></div>`;
            this.uiElements.emptyState.classList.remove('hidden');
            this.uiElements.sortableList.classList.add('hidden');
        } else {
            this.uiElements.emptyState.classList.add('hidden');
            this.uiElements.sortableList.classList.remove('hidden');
        }
    }
}