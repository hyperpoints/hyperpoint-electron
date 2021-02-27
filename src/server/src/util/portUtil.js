const { node, association, user } = require('../db/models');
const { Op } = require('sequelize');

exports.transferImportedUserData = async (packageUUID, loggedInUserNode) => {
  console.log('\n' + 'associating imported user data to logged in user');
  // 1) "look up" all the user nodes and associations in the import
  const userNodeList = await node.findAll({
    where: {
      [Op.and]: {
        importId: packageUUID,
        type: 'user',
      },
    },
    // include whichever node is the associated one for
    include: [
      {
        model: association,
        where: {
          [Op.or]: [{ nodeType: 'user' }, { linkedNodeType: 'user' }],
        },
        required: false,
        as: 'original',
      },
      {
        model: association,
        where: {
          [Op.or]: [{ nodeType: 'user' }, { linkedNodeType: 'user' }],
        },
        required: false,
        as: 'associated',
      },
    ],
  });
  // 2) replace the user part of the association with the values of loggedInUser
  for (userNode of userNodeList) {
    if (userNode.original) {
      userNode.original.forEach((association) => {
        if (association.nodeType === 'user') {
          association.nodeId = loggedInUserNode.id;
          association.nodeUUID = loggedInUserNode.uuid;
          association.save();
        } else if (association.linkedNodeType === 'user') {
          association.linkedNode = loggedInUserNode.id;
          association.linkedNodeUUID = loggedInUserNode.uuid;
          association.save();
        }
      });
    }
    if (userNode.associated) {
      userNode.associated.forEach((association) => {
        if (association.nodeType === 'user') {
          association.nodeId = loggedInUserNode.id;
          association.nodeUUID = loggedInUserNode.uuid;
          association.save();
        } else if (association.linkedNodeType === 'user') {
          association.linkedNode = loggedInUserNode.id;
          association.linkedNodeUUID = loggedInUserNode.uuid;
          association.save();
        }
      });
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
