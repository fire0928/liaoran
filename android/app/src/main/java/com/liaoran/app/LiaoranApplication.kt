package com.liaoran.app

import android.app.Application

class LiaoranApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        instance = this
    }

    companion object {
        lateinit var instance: LiaoranApplication
            private set
    }
}
