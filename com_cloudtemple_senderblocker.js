
/**
 * Copyright 2011 University of Guelph - Computing and Communication Services
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * 
 * @overview
 * This add-on allows the user to set personal always-block/always allow
 * sender addreses from a handy shortcut in the context menu of a message
 * 
 * @author Kennt Chan
 * modfify by cloud temple (smo)
 */
function com_cloudtemple_senderblockerHandlerObject() {
}

com_cloudtemple_senderblockerHandlerObject.prototype = new ZmZimletBase();
com_cloudtemple_senderblockerHandlerObject.prototype.constructor = com_cloudtemple_senderblockerHandlerObject;

function SenderBlocker() {
}

SenderBlocker = com_cloudtemple_senderblockerHandlerObject;

SenderBlocker.OP_BLOCK = "BLOCK";
SenderBlocker.OP_BLOCK_SENDER = "BLOCK_SENDER";
SenderBlocker.OP_BLOCK_DOMAIN = "BLOCK_DOMAIN";
SenderBlocker.OP_UNBLOCK = "UNBLOCK";
SenderBlocker.OP_UNBLOCK_SENDER = "UNBLOCK_SENDER";
SenderBlocker.OP_UNBLOCK_DOMAIN = "UNBLOCK_DOMAIN";

SenderBlocker.REQ_BLACKLIST = "blackList";
SenderBlocker.REQ_WHITELIST = "whiteList";
/**
 * Init the zimlet
 */
SenderBlocker.prototype.init = function() {
};

/**
 * Adds the allow/block buttons to the menu provided
 * @param controller
 * @param actionMenu
 */
SenderBlocker.prototype.onMenuInitialized = function(controller, actionMenu) {
  actionMenu.createSeparator();

  var menu_ids = [SenderBlocker.OP_BLOCK, SenderBlocker.OP_UNBLOCK];
  var block_params = { text: this.getMessage("block_label"), image: "JunkMail" };
  var unblock_params = { text: this.getMessage("unblock_label"), image: "Check" };
  var menu_params = [block_params, unblock_params];

  for (var i = 0; i < menu_ids.length; i++) {
    var menu_id = menu_ids[i];
    if (!actionMenu.getMenuItem(menu_id)) {
      var menuItem = actionMenu.createMenuItem(menu_id, menu_params[i]);
      var popupMenu = new ZmPopupMenu(menuItem);

      // create dropdown list
      var subMenu_ids = {
        BLOCK: [SenderBlocker.OP_BLOCK_SENDER, SenderBlocker.OP_BLOCK_DOMAIN],
        UNBLOCK: [SenderBlocker.OP_UNBLOCK_SENDER, SenderBlocker.OP_UNBLOCK_DOMAIN]
      };
      var sender_params = { text: this.getMessage("sender_label"), image: "BlockUser" };
      var domain_params = { text: this.getMessage("domain_label"), image: "Domain" };
      var subMenu_params = [sender_params, domain_params];

      for (var j = 0; j < subMenu_ids[menu_id].length; j++) {
        var subMenu_id = subMenu_ids[menu_id][j];
        if (!popupMenu._menuItems[subMenu_id]) {
          var btnBlockSender = popupMenu.createMenuItem(subMenu_id, subMenu_params[j]);
          btnBlockSender.addSelectionListener(new AjxListener(this, this.modifyUserBlocking, [controller, subMenu_id]));
        }
      }

      menuItem.setMenu(popupMenu);
    }
  }
  actionMenu.addPopupListener(new AjxListener(this, this.onRightClick, [controller, actionMenu]));
};

/**
 * Called when the context menu is initialized and called on the message body or
 * for multiple messages
 * @param controller
 * @param actionMenu
 */
SenderBlocker.prototype.onActionMenuInitialized = function(controller, actionMenu) {
    this.onMenuInitialized(controller, actionMenu);
};

/**
 * Called when the context menu is initialized in the sender of a message.
 * @param controller
 * @param actionMenu
 */
SenderBlocker.prototype.onParticipantActionMenuInitialized = function(controller, actionMenu) {
    this.onMenuInitialized(controller, actionMenu);
};

/**
 * Listener called when the menu pops up, changes the buttons depending on the number of selected items
 * @param controller
 * @param actionMenu
 */
SenderBlocker.prototype.onRightClick = function(controller, actionMenu) {
  var blockDropMenu = actionMenu.getMenuItem(SenderBlocker.OP_BLOCK)._menu;
  var unblockDropMenu = actionMenu.getMenuItem(SenderBlocker.OP_UNBLOCK)._menu;

  var selected = controller.getListView().getDnDSelection()
  selected = (selected instanceof Array) ? selected : [selected];
  selected = selected.length;

  // default behaviour is disable for more than one, changed here
  actionMenu.enable([SenderBlocker.OP_BLOCK, SenderBlocker.OP_UNBLOCK, SenderBlocker.OP_BLOCK_SENDER, SenderBlocker.OP_UNBLOCK_SENDER], selected > 0);

  // changing the labels of the buttons depending on the number of selected items
  if (selected > 1) {
    blockDropMenu.getMenuItem(SenderBlocker.OP_BLOCK_SENDER).setText(this.getMessage("senders_label"));
    blockDropMenu.getMenuItem(SenderBlocker.OP_BLOCK_DOMAIN).setText(this.getMessage("domains_label"));
    unblockDropMenu.getMenuItem(SenderBlocker.OP_UNBLOCK_SENDER).setText(this.getMessage("senders_label"));
    unblockDropMenu.getMenuItem(SenderBlocker.OP_UNBLOCK_DOMAIN).setText(this.getMessage("domains_label"));
  } else {
    blockDropMenu.getMenuItem(SenderBlocker.OP_BLOCK_SENDER).setText(this.getMessage("sender_label"));
    blockDropMenu.getMenuItem(SenderBlocker.OP_BLOCK_DOMAIN).setText(this.getMessage("domain_label"));
    unblockDropMenu.getMenuItem(SenderBlocker.OP_UNBLOCK_SENDER).setText(this.getMessage("sender_label"));
    unblockDropMenu.getMenuItem(SenderBlocker.OP_UNBLOCK_DOMAIN).setText(this.getMessage("domain_label"));
  }
};

/**
 * Listener called when either the Block or Allow button is clicked
 * @param controller
 * @param type
 */
SenderBlocker.prototype.modifyUserBlocking = function(controller, type) {
  var selected = controller.getListView().getDnDSelection()
  selected = (selected instanceof Array) ? selected : [selected];
  this.sendModifyBlackListRequest(selected, type);
};

/**
 * Gets the email address from the email object
 * @param item ZmMailMsg/ZmConv
 * @returns string
 */
SenderBlocker.prototype.getAddress = function(item, type) {
  var eml;
  // when the item is a conversation select the first of
  // the senders
  if (item.type === ZmId.ITEM_CONV) {
    var arry = item.participants.getArray();
    if(arry.length >0) {
      eml = arry[arry.length - 1].address;
    }
  } else if (item.type === ZmId.ITEM_MSG) {
    var obj = item.getAddress(AjxEmailAddress.FROM);
    if(obj)
      eml = obj.address;
  }

  if (/DOMAIN/.test(type)) {
    eml = eml.split("@")[1];
  }

  this.sendersModified[eml] = null;
  return eml;
};

/**
 * Creates and sends the request to modify the blacklist and whitelist for the user
 *
 * @param messageList messages
 * @param type whether it's Allow/Block
 */
SenderBlocker.prototype.sendModifyBlackListRequest = function(messageList, type) {
  this.sendersModified = [];
  var soapDoc = AjxSoapDoc.create("BatchRequest", "urn:zimbra");
  soapDoc.setMethodAttribute("onerror", "stop");
  var request = soapDoc.set("ModifyWhiteBlackListRequest", null, null, "urn:zimbraAccount");
  var actionType = SenderBlocker.OP_BLOCK_SENDER === type || SenderBlocker.OP_BLOCK_DOMAIN === type ? SenderBlocker.REQ_BLACKLIST : SenderBlocker.REQ_WHITELIST;
  var prevActionType = SenderBlocker.REQ_BLACKLIST === actionType? SenderBlocker.REQ_WHITELIST : SenderBlocker.REQ_BLACKLIST;

  // remove the address from the opposite list, server handles non-registered
  // addresses safely
  var prevAction = soapDoc.set(prevActionType);
  this.buildAddrs(messageList, type, soapDoc, prevAction, "-");
  request.appendChild(prevAction);

  // add to the corresponding list
  var action = soapDoc.set(actionType);
  this.buildAddrs(messageList, type, soapDoc, action, "+");
  request.appendChild(action);

  // send batch request
  appCtxt.getAppController().sendRequest({
    soapDoc : soapDoc,
    asyncMode : true,
    callback : new AjxCallback(this, this.modifyBlackListHandler, type)
  });
};

/**
 * Adds the xml corresponding to the addresses and the operation
 * @param messageList ZmMsg
 * @param soapDoc the soap request
 * @param action the xml action node
 * @param op the operation +/-
 */
SenderBlocker.prototype.buildAddrs = function(messageList, type, soapDoc, action, op) {
  for ( var i = 0; i < messageList.length; i++) {
    var addr = soapDoc.set("addr");
    addr.setAttribute("op", op);
    if (AjxEnv.isIE) {
      addr.text = this.getAddress(messageList[i], type);
    } else {
      addr.textContent = this.getAddress(messageList[i], type);
    }
    action.appendChild(addr);
  }
};

/**
 * Handles the server response
 * @param response
 */
SenderBlocker.prototype.modifyBlackListHandler = function(type) {
  var msg = "";
  switch (type) {
    case SenderBlocker.OP_BLOCK_SENDER:
      msg = this.getMessage("senders_blocked");
      break;
    case SenderBlocker.OP_UNBLOCK_SENDER:
      msg = this.getMessage("senders_unblocked");
      break;
    case SenderBlocker.OP_BLOCK_DOMAIN:
      msg = this.getMessage("domains_blocked");
      break;
    case SenderBlocker.OP_UNBLOCK_DOMAIN:
      msg = this.getMessage("domains_unblocked");
      break;
    default:
      console.log("Unknown button...");
  }
  msg += " " + Object.keys(this.sendersModified).join(", ");
  appCtxt.getAppController().setStatusMsg(msg, ZmStatusView.LEVEL_INFO);
  this.sendersModified = null;
};

//UTILITIES
/**
* For compatibility
* Get the keys from the object passed
*/
Object.keys = Object.keys || function(o) {
  var result = [];
  for(var name in o) {
    if (o.hasOwnProperty(name))
      result.push(name);
  }
  return result;
};
