package com.arhiem.still

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.arhiem.still.presentation.navigation.StillAppRoot
import com.arhiem.still.presentation.theme.StillTheme

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val appContainer = (application as StillApplication).container

        setContent {
            StillTheme {
                StillAppRoot(appContainer = appContainer)
            }
        }
    }
}
