package com.alarm_project.alarm

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.modules.SerializersModule
import kotlinx.serialization.modules.polymorphic
import kotlinx.serialization.modules.subclass

@Serializable
enum class AlarmMode {
    @SerialName("normal") NORMAL,
    @SerialName("shake") SHAKE,
    @SerialName("math") MATH
}

@Serializable
enum class LocationRequirement {
    @SerialName("home-in") HOME_IN,
    @SerialName("home-out") HOME_OUT,
    @SerialName("any") ANY
}

@Serializable
enum class AlarmChannel {
    @SerialName("alarms") ALARMS,
    @SerialName("silent") SILENT
}

@Serializable
data class Policy(
    val mode: AlarmMode = AlarmMode.NORMAL,
    val snoozeMinutes: List<Int>? = null,
    val requireLocation: LocationRequirement? = null,
    val volume: Double? = null
)

@Serializable
data class AlarmSpec(
    val id: String,
    val fireAt: Long,
    val policy: Policy,
    val label: String? = null,
    val payload: Map<String, String>? = null,
    val allowWhileIdle: Boolean = true,
    val channel: AlarmChannel = AlarmChannel.ALARMS,
    val metadata: Map<String, String>? = null
)

@Serializable
data class LocationSnapshot(
    val latitude: Double,
    val longitude: Double,
    val accuracyMeters: Float,
    val ageMillis: Long,
    val provider: String
)

@Serializable
data class DeviceSnapshot(
    val timezone: String,
    val isScreenOn: Boolean,
    val batteryLevel: Double,
    val isPowerSaveMode: Boolean,
    val ringerMode: String,
    val musicVolume: Int,
    val musicVolumeMax: Int
)

@Serializable
data class ContextSnapshot(
    val specId: String,
    val firedAtUtc: Long,
    val receivedAtUtc: Long,
    val policy: Policy,
    val device: DeviceSnapshot,
    val location: LocationSnapshot? = null,
    val extras: Map<String, JsonElement>? = null
)

@Serializable
sealed interface EngineCommand {
    val id: String
}

@Serializable
@SerialName("UI_READY")
data class UiReadyCommand(override val id: String, val timestampUtc: Long = System.currentTimeMillis()) : EngineCommand

@Serializable
@SerialName("RING_NATIVE")
data class RingNativeCommand(
    override val id: String,
    val fullScreen: Boolean = false,
    val channel: AlarmChannel? = null
) : EngineCommand

@Serializable
@SerialName("OPEN_MODE_UI")
data class OpenModeUiCommand(
    override val id: String,
    val route: String,
    val seed: Long? = null,
    val extras: Map<String, String>? = null
) : EngineCommand

@Serializable
@SerialName("SNOOZE")
data class SnoozeCommand(
    override val id: String,
    val minutes: Int? = null
) : EngineCommand

@Serializable
@SerialName("DISMISS")
data class DismissCommand(override val id: String) : EngineCommand

@Serializable
@SerialName("STOP_NATIVE")
data class StopNativeCommand(override val id: String) : EngineCommand

@Serializable
sealed interface AlarmEvent {
    val id: String
}

@Serializable
@SerialName("SCHEDULED")
data class ScheduledEvent(override val id: String, val fireAt: Long) : AlarmEvent

@Serializable
@SerialName("FIRED")
data class FiredEvent(override val id: String, val ctx: ContextSnapshot) : AlarmEvent

@Serializable
@SerialName("SNOOZED")
data class SnoozedEvent(override val id: String, val nextFireAt: Long, val minutes: Int) : AlarmEvent

@Serializable
@SerialName("DISMISSED")
data class DismissedEvent(override val id: String, val dismissedAtUtc: Long) : AlarmEvent

@Serializable
@SerialName("ERROR")
data class ErrorEvent(override val id: String, val code: String, val message: String) : AlarmEvent

object AlarmJson {
    private val jsonModule = SerializersModule {
        polymorphic(EngineCommand::class) {
            subclass(UiReadyCommand::class)
            subclass(RingNativeCommand::class)
            subclass(OpenModeUiCommand::class)
            subclass(SnoozeCommand::class)
            subclass(DismissCommand::class)
            subclass(StopNativeCommand::class)
        }
        polymorphic(AlarmEvent::class) {
            subclass(ScheduledEvent::class)
            subclass(FiredEvent::class)
            subclass(SnoozedEvent::class)
            subclass(DismissedEvent::class)
            subclass(ErrorEvent::class)
        }
    }

    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
        classDiscriminator = "type"
        serializersModule = jsonModule
    }

    fun encodeSpec(spec: AlarmSpec): String = json.encodeToString(AlarmSpec.serializer(), spec)

    fun decodeSpec(raw: String): AlarmSpec = json.decodeFromString(AlarmSpec.serializer(), raw)

    fun encodeCommand(command: EngineCommand): String = json.encodeToString(EngineCommand.serializer(), command)

    fun decodeCommand(raw: String): EngineCommand = json.decodeFromString(EngineCommand.serializer(), raw)

    fun encodeEvent(event: AlarmEvent): String = json.encodeToString(AlarmEvent.serializer(), event)

    fun decodeEvent(raw: String): AlarmEvent = json.decodeFromString(AlarmEvent.serializer(), raw)

    fun encodeContext(context: ContextSnapshot): JsonObject = json.encodeToJsonElement(ContextSnapshot.serializer(), context) as JsonObject

    fun encodeDevice(device: DeviceSnapshot): JsonObject = json.encodeToJsonElement(DeviceSnapshot.serializer(), device) as JsonObject

    fun encodeLocation(location: LocationSnapshot): JsonObject = json.encodeToJsonElement(LocationSnapshot.serializer(), location) as JsonObject

    fun encodeExtras(extras: Map<String, String>?): JsonObject? = extras?.mapValues { JsonPrimitive(it.value) }?.let { JsonObject(it) }
}
