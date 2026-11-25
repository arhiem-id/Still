package com.arhiem.still.presentation.screens.studio

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.arhiem.still.rendering.StillRenderEngine
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class StudioUiState(
    val selectedPhotoUri: Uri? = null,
    val colorSpaceLabel: String = "",
    val isPipelineReady: Boolean = false
)

class StudioViewModel(
    renderEngine: StillRenderEngine
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        StudioUiState(
            colorSpaceLabel = renderEngine.capabilities.colorSpaceLabel,
            isPipelineReady = renderEngine.capabilities.isPipelineInitialized
        )
    )
    val uiState: StateFlow<StudioUiState> = _uiState.asStateFlow()

    fun onPhotoSelected(uri: Uri?) {
        _uiState.update { it.copy(selectedPhotoUri = uri) }
    }

    fun onClearSelection() {
        _uiState.update { it.copy(selectedPhotoUri = null) }
    }

    companion object {
        fun provideFactory(renderEngine: StillRenderEngine): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return StudioViewModel(renderEngine) as T
                }
            }
    }
}
