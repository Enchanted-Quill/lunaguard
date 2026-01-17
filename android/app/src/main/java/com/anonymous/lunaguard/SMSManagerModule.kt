// android/app/src/main/java/com/anonymous/lunaguard/SmsManagerModule.kt
package com.anonymous.lunaguard

import android.telephony.SmsManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class SmsManagerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return MODULE_NAME
    }

    @ReactMethod
    fun sendTextMessage(
        phoneNumber: String,
        scAddress: String?,
        message: String,
        sentIntent: String?,
        deliveryIntent: String?,
        promise: Promise
    ) {
        try {
            val smsManager = SmsManager.getDefault()

            // For long messages, divide into multiple parts
            if (message.length > 160) {
                val parts = smsManager.divideMessage(message)
                smsManager.sendMultipartTextMessage(
                    phoneNumber,
                    scAddress,
                    parts,
                    null,
                    null
                )
            } else {
                smsManager.sendTextMessage(
                    phoneNumber,
                    scAddress,
                    message,
                    null,
                    null
                )
            }

            promise.resolve("SMS sent successfully to $phoneNumber")
        } catch (e: Exception) {
            promise.reject("SMS_SEND_ERROR", "Failed to send SMS: ${e.message}", e)
        }
    }

    companion object {
        private const val MODULE_NAME = "SmsManager"
    }
}