'use strict';

const ComponentReactionsTypes = window["reactionsComponentTestPart"].ReactionsTypes;
const itemId = '2457ffb3-11a1-4e3f-ba46-b1cdaea055c5';

function messageHandler() {
    buildfire.messaging.onReceivedMessage = (message) => {
        let { openReactionList, reactions, groups } = message;

        if (reactions && Array.isArray(reactions)) {
            reactions = reactions.filter(reaction => (reaction.isActive && reaction.selectedUrl && reaction.unSelectedUrl));
            ComponentReactionsTypes.itemsReactionsTypes[itemId] = reactions;
            ComponentReactionsTypes.groups = groups;

            document.getElementById('main-reactions-container').innerHTML = `<div bf-reactions-itemid=${itemId}></div>`;
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