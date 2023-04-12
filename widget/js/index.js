'use strict';

const ComponentReactionsTypes = window["reactionsComponentTestPart"].ReactionsTypes;

function messageHandler() {
    buildfire.messaging.onReceivedMessage = (message) => {
        let { openReactionList, reactions, groups } = message;

        if (reactions && Array.isArray(reactions)) {
            reactions = reactions.filter(reaction => (reaction.isActive && reaction.selectedUrl && reaction.unSelectedUrl));
            ComponentReactionsTypes.itemsReactionsTypes["itemId_2"] = reactions;
            ComponentReactionsTypes.groups = groups;

            document.getElementById('main-reactions-container').innerHTML = `<div bf-reactions-itemid="itemId_2" bf-reactions-showCount="true" bf-reactions-showUsersReactions="true"></div>`;
        }

        setTimeout(() => {
            let iconsContainer = document.querySelector('.reactions-icon-container');
            if (openReactionList && reactions.length > 1 && iconsContainer) {
                iconsContainer.classList.remove('reactions-hidden');
            }
        }, 500)
    };
}

function init() {
    messageHandler();
}

init();