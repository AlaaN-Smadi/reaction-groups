mocha.setup('bdd')

mocha.globals(['jQuery']);
mocha.run();

let expect = chai.expect;

let reaction1 = new ReactionsTypes({
    id: '123456789',
    selectedUrl: '',
    unSelectedUrl: '',
    isActive: true,
});
let group1 = new Group({
    name: 'Group 1',
    reactions: [reaction1],
    createdBy: 'userId',
    lastUpdatedBy: 'userId',
});
let reactionGroups = new ReactionsGroup({ groups: [group1] });

describe('Reaction Groups Tests', function () {
    describe(' - Insert Group', function () {
        it(' . Should Insert the Reaction to the appData ', function (done) {
            ReactionsGroups.insert(reactionGroups, (err, res) => {

                expect(err).to.equal(null);

                expect(res.data).to.be.an('Object');
                expect(res.data.groups[0].name).to.equal('Group 1');

                done();
            });
        });
    });
    describe(' - Update Group', function () {
        it(' . Should Update the Reaction object ', function (done) {
            let updatedGroups = {...reactionGroups};
            updatedGroups.groups[0].name = 'Updated Group';

            ReactionsGroups.update(updatedGroups, (err, res) => {

                expect(err).to.equal(null);

                expect(res.data).to.be.an('Object');
                expect(res.data.groups[0].name).to.equal('Updated Group');

                done();
            });
        });
    });
    describe(' - Get Groups', function () {
        it(' . Should Get all Reaction Groups ', function (done) {
            ReactionsGroups.get({}, (err, res) => {

                expect(err).to.equal(null);

                expect(res.groups).to.be.an('Array');
                expect(res.groups[0]).to.be.an('Object');

                done();
            });
        });
    });
    describe(' - Get Group By Name', function () {
        it(' . Should Get single Reaction Group ', function (done) {
            ReactionsGroups.getByName('Updated Group', (err, res) => {

                expect(err).to.equal(null);

                expect(res).to.be.an('Object');
                expect(res.reactions).to.be.an('Array');
                expect(res.createdBy).to.equal('userId');

                done();
            });
        });
    });
    describe(' - Delete Group By Name', function () {
        it(' . Should Delete single Reaction Group ', function (done) {
            ReactionsGroups.delete('Updated Group', (err, res) => {

                expect(err).to.equal(null);

                expect(res).to.be.an('Object');

                done();
            });
        });
    });
})



