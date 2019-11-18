const PublicKeyUtils = artifacts.require("PublicKeyUtils");
const HastoStorage = artifacts.require("HastoStorage");

module.exports = function(deployer) {
  deployer.deploy(PublicKeyUtils);
  deployer.link(PublicKeyUtils, HastoStorage);
  deployer.deploy(HastoStorage);
};
