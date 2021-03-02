const { node, association, user } = require('../db/models');
const { Op } = require('sequelize');

exports.transferImportedUserData = async (packageUUID, loggedInUserNode) => {
  console.log('\n' + 'associating imported user data to logged in user');
  const associations = await association.findAll({
    where: {
      [Op.and]: {
        importId: packageUUID,
        [Op.or]: {
          nodeType: 'user',
          linkedNodeType: 'user',
        },
      },
    },
  });
  // loop through and update the association values with the logged in user values instead
  for (let item of associations) {
    if (item.nodeType === 'user') {
      item.nodeUUID = loggedInUserNode.uuid.toString();
      item.nodeId = loggedInUserNode.id.toString();
      item.save();
    } else if (item.linkedNodeType === 'user') {
      item.linkedNodeUUID = loggedInUserNode.uuid.toString();
      item.linkedNode = loggedInUserNode.id.toString();
      item.save();
    }
  }
  // 3) delete all user nodes from nodes table with the importId
  await node.destroy({
    where: {
      [Op.and]: {
        type: 'user',
        importId: packageUUID,
      },
    },
  });
};

exports.countBrokenAssociations = async () => {
  console.log('counting broken associations');
  let count = 0;
  // load all associations into a variable
  const result = await association.findAll({
    order: [['updatedAt', 'ASC']],
  });
  // iterate through the associations
  for (value of result) {
    const anchorNode = await node.findOne({
      where: {
        id: value.nodeId,
      },
    });
    const linkedNode = await node.findOne({
      where: {
        id: value.linkedNode,
      },
    });
    // if one of them is missing, clear the association
    if (!anchorNode || !linkedNode) {
      console.log(
        'id: ' + value.id + ', nodeId: ' + value.nodeId + ', linkedNode: ' + value.linkedNode
      );
      count++;
    }
  }
  console.log('there are ' + count + ' broken associations');
  console.log('done');
  return;
};

exports.findAndReplaceTextNodeUUID = async (oldUUID, newUUID, importId) => {
  console.log('updating instances of text content uuid ' + oldUUID + ' with ' + newUUID);
  // perform a text search of the content column of the text node types
  // searching for a match of "oldUUID"
  const result = await node.findAll({
    where: {
      [Op.and]: {
        content: { [Op.like]: '%' + oldUUID + '%' },
        importId: importId,
      },
    },
  });
  // loop through the nodes
  for (let item of result) {
    // set up regex to search globally for the oldUUID
    const regex = new RegExp(oldUUID, 'g');
    // replace all instances of the uuid
    const newContent = item.content.replace(regex, newUUID);
    // update the content value
    item.content = newContent;
    // save the updated content into the database
    item.save();
  }
  // and...we're done!
  return;
};
