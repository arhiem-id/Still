package com.arhiem.still

import android.app.Application
import com.arhiem.still.di.AppContainer

class StillApplication : Application() {

    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer()
    }
}
