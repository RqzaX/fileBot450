"use strict";

// Import module utils từ thư mục cha
const utils = require("../utils");

// Hàm kiểm tra callback có thể gọi được không
function canBeCalled(func) {
  try {
    Reflect.apply(func, null, []);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Hàm chia sẻ thông tin liên hệ.
 * @param {string} [text=""] - Nội dung tin nhắn đi kèm với chia sẻ liên hệ.
 * @param {string} contactID - ID người dùng của liên hệ bạn muốn chia sẻ.
 * @param {string} threadID - ID chuỗi tin nhắn mà bạn muốn gửi thông tin liên hệ.
 * @param {Function} callback - Hàm callback cho chức năng.
 */
module.exports = function (defaultFuncs, api, ctx) {
    return function shareContact(text, contactID, threadID, callback) {
      // Kiểm tra kết nối MQTT
      if (!ctx || !ctx.mqttClient) {
        throw new Error("Không kết nối được tới MQTT");
      }
  
      // Đảm bảo ctx.wsReqNumber được khởi tạo và có giá trị là một số
      ctx.wsReqNumber = ctx.wsReqNumber || 0;
  
      // Tạo Promise mới để quản lý bất đồng bộ
      let resolveFunc, rejectFunc;
      const returnPromise = new Promise((resolve, reject) => {
        resolveFunc = resolve;
        rejectFunc = reject;
      });
  
      // Kiểm tra callback nếu không tồn tại hoặc không phải là function
      if (!callback || typeof callback !== 'function') {
        // Định nghĩa callback mặc định
        callback = function (err, data) {
          if (err) return rejectFunc(err);
          resolveFunc(data);
        };
      }
  
      // Xây dựng ngữ cảnh để gửi qua MQTT
      const context = JSON.stringify({
        app_id: "2220391788200892", // ID ứng dụng
        payload: JSON.stringify({
          tasks: [
            {
              label: "359",
              payload: JSON.stringify({
                contact_id: contactID, // ID người gửi
                sync_group: 1,
                text: text || "", // Nội dung tin nhắn
                thread_id: threadID // ID chuỗi tin nhắn
              }),
              queue_name: "messenger_contact_sharing",
              task_id: Math.floor(Math.random() * 1001), // ID ngẫu nhiên cho task
              failure_count: null,
            },
          ],
          epoch_id: utils.generateOfflineThreadingID(), // ID phiên
          version_id: "7214102258676893", // Phiên bản
        }),
        request_id: ctx.wsReqNumber, // ID yêu cầu
        type: 3,
      });
  
      // Lưu callback vào ctx với key là request_id
      if (!ctx.reqCallbacks) {
        ctx.reqCallbacks = {};
      }
      ctx.reqCallbacks[ctx.wsReqNumber] = callback;
  
      // Gửi tin nhắn qua MQTT
      ctx.mqttClient.publish("/ls_req", context, { qos: 1, retain: false });
  
      // Tăng số yêu cầu WebSocket sau khi gửi
      ctx.wsReqNumber += 1;
  
      // Trả về Promise
      return returnPromise;
    };
  };