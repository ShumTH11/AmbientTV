package com.ambienttv.ui.component

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Border
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text

/**
 * TV-optimized button with D-pad focus visualization.
 *
 * This button is designed specifically for Android TV navigation using a D-pad/remote.
 * It provides clear visual feedback when focused, with an expanded scale effect,
 * glowing border, and increased brightness to make focused elements obvious
 * from a distance.
 *
 * Features:
 * - Large minimum height (48dp) for easy targeting with a remote
 * - Visible focus ring with accent color border
 * - Scale animation when focused
 * - High contrast text for readability on TV screens
 *
 * @param text The button label text
 * @param onClick Callback invoked when the button is clicked (press center on D-pad)
 * @param modifier Optional modifier for customizing layout
 * @param enabled Whether the button is interactive
 */
@Composable
fun FocusableButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true
) {
    Button(
        onClick = onClick,
        modifier = modifier
            .height(48.dp),
        enabled = enabled,
        scale = ButtonDefaults.scale(
            scale = 1.0f,
            focusedScale = 1.05f,
            pressedScale = 0.98f
        ),
        shape = ButtonDefaults.shape(
            shape = RoundedCornerShape(8.dp),
            focusedShape = RoundedCornerShape(8.dp),
            pressedShape = RoundedCornerShape(8.dp)
        ),
        colors = ButtonDefaults.colors(
            focusedContainerColor = MaterialTheme.colorScheme.primary,
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
            disabledContainerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.3f)
        ),
        border = ButtonDefaults.border(
            focusedBorder = Border(
                border = BorderStroke(
                    width = 2.dp,
                    color = MaterialTheme.colorScheme.primary
                ),
                shape = RoundedCornerShape(8.dp)
            ),
            border = Border(
                border = BorderStroke(
                    width = 1.dp,
                    color = Color.Transparent
                ),
                shape = RoundedCornerShape(8.dp)
            )
        ),
        contentPadding = ButtonDefaults.ContentPadding
    ) {
        Text(
            text = text,
            style = TextStyle(
                fontSize = 16.sp,
                letterSpacing = 0.5.sp
            )
        )
    }
}

/**
 * Compact variant of FocusableButton for use in rows and toolbars.
 *
 * @param text The button label text
 * @param onClick Callback invoked when the button is clicked
 * @param modifier Optional modifier for customizing layout
 * @param enabled Whether the button is interactive
 */
@Composable
fun FocusableIconButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true
) {
    Button(
        onClick = onClick,
        modifier = modifier
            .height(40.dp),
        enabled = enabled,
        scale = ButtonDefaults.scale(
            scale = 1.0f,
            focusedScale = 1.08f,
            pressedScale = 0.96f
        ),
        shape = ButtonDefaults.shape(
            shape = RoundedCornerShape(20.dp),
            focusedShape = RoundedCornerShape(20.dp),
            pressedShape = RoundedCornerShape(20.dp)
        ),
        colors = ButtonDefaults.colors(
            focusedContainerColor = MaterialTheme.colorScheme.secondaryContainer,
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
        ),
        border = ButtonDefaults.border(
            focusedBorder = Border(
                border = BorderStroke(
                    width = 2.dp,
                    color = MaterialTheme.colorScheme.secondary
                ),
                shape = RoundedCornerShape(20.dp)
            )
        )
    ) {
        Text(
            text = text,
            style = TextStyle(fontSize = 14.sp)
        )
    }
}
