const PublicKeyUtils = artifacts.require('PublicKeyUtils');
const HastoStorage = artifacts.require('HastoStorage');

const fs = require('fs');

module.exports = function(deployer) {
  deployer.deploy(PublicKeyUtils);
  deployer.link(PublicKeyUtils, HastoStorage);
  deployer.deploy(HastoStorage).then(() => {
    fs.writeFileSync('./.contractAddress', HastoStorage.address, { encoding: 'utf8' });
  });
};
