import React, { useState } from 'react';
import { StyleSheet, ScrollView, SafeAreaView, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { setUser } from '../store/slice/userSlice'; // setUser 액션 가져오기
import Header from '../components/profile/editProfile/Header';
import EditForm from '../components/profile/editProfile/EditForm';
import * as ImagePicker from 'expo-image-picker';

const EditProfileScreen = ({route, navigation}) => {
	console.log('EditProfileScreen 실행');
	const dispatch = useDispatch();
	const auth = getAuth();
	const db = getFirestore();
	const storage = getStorage();
	const currentUser = useSelector(state => state.user.user);

	const [updatedProfile, setUpdatedProfile] = useState(route.params);

	const handleFormChange = (newData) => {
		setUpdatedProfile(prevData => ({...prevData, ...newData}));
	};

	const handleImagePick = async () => {
		let result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			aspect: [1, 1],
			quality: 1,
		});

		if (!result.canceled) {
			const imageUri = result.assets[0].uri;
			setUpdatedProfile(prevData => ({...prevData, profileImg: imageUri}));
			return imageUri;
		}
		return null;
	};

	const uploadImage = async (uri) => {
		const response = await fetch(uri);
		const blob = await response.blob();
		const fileRef = ref(storage, `${auth.currentUser.uid}/profileImg`);
		await uploadBytes(fileRef, blob);
		return await getDownloadURL(fileRef);
	};

	const handleSave = async () => {
		try {
			const user = auth.currentUser;
			if (user) {
				const userRef = doc(db, 'users', user.uid);
				
				const updateData = {
					profile: {
						userName: updatedProfile.name,
						birthdate: updatedProfile.birthdate,
					},
					userId: updatedProfile.userId,
					userPhone: updatedProfile.phone,
				};

				if (updatedProfile.mbti) updateData.profile.mbti = updatedProfile.mbti;
				if (updatedProfile.personality) updateData.profile.personality = updatedProfile.personality;
				
				// 프로필 이미지 업로드 및 URL 저장
				if (updatedProfile.profileImg && updatedProfile.profileImg !== currentUser.profileImg) {
					const imageUrl = await uploadImage(updatedProfile.profileImg);
					updateData.profileImg = imageUrl;
				}

				await updateDoc(userRef, updateData);

				// Redux 상태 업데이트
				const updatedUserData = {
					...currentUser,
					...updatedProfile,
					profile: {
						...currentUser.profile,
						...updateData.profile
					},
					profileImg: updateData.profileImg || currentUser.profileImg
				};
				dispatch(setUser(updatedUserData));

				console.log('프로필이 성공적으로 업데이트되었습니다.');
				navigation.goBack();
			}
		} catch (error) {
			console.error('프로필 업데이트 중 오류 발생:', error);
			alert('프로필 업데이트에 실패했습니다. 다시 시도해 주세요.');
		}
	};

	return (
		<SafeAreaView style={styles.safe}>
			<Header navigation={navigation} onSave={handleSave} />
			<ScrollView showsVerticalScrollIndicator={false}>
				<EditForm
					{...updatedProfile}
					onSave={handleFormChange}
					onImagePick={handleImagePick}
				/>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: {
		flex: 1,
		paddingTop: Platform.OS === 'android' ? 25 : 0,
		backgroundColor: '#fff',
	}
});

export default EditProfileScreen;
