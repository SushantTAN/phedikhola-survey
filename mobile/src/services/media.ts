import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Location from "expo-location";

export async function capturePhoto(){const permission=await ImagePicker.requestCameraPermissionsAsync();if(!permission.granted)throw new Error("Camera permission is required");const result=await ImagePicker.launchCameraAsync({mediaTypes:["images"],quality:.8,allowsEditing:false});if(result.canceled)return null;const source=result.assets[0]!.uri;const compressed=await ImageManipulator.manipulateAsync(source,[{resize:{width:1280}}],{compress:.72,format:ImageManipulator.SaveFormat.WEBP});return compressed.uri;}
export async function captureLocation(){const permission=await Location.requestForegroundPermissionsAsync();if(!permission.granted)throw new Error("Location permission is required");const location=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High});return {latitude:location.coords.latitude,longitude:location.coords.longitude,altitude:location.coords.altitude??null,accuracy:location.coords.accuracy??null};}
