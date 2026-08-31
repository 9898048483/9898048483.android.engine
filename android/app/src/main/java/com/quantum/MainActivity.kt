package com.quantum

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform
import android.util.Log

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Set content view if there's a layout, omitting for structural purposes
        
        initPython()
    }

    private fun initPython() {
        try {
            if (!Python.isStarted()) {
                Python.start(AndroidPlatform(this))
                Log.i("MainActivity", "Chaquopy Python environment initialized successfully.")
            }
        } catch (e: Exception) {
            Log.e("MainActivity", "Failed to initialize Chaquopy Python environment: ${e.message}")
        }
    }
}
