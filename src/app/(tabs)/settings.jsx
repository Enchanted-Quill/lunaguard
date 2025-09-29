import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { auth } from '../../../firebaseConfig'
import { getAuth } from 'firebase/auth'
import { router } from 'expo-router'

const settings = () => {

  getAuth().onAuthStateChanged((user) => {
      if (!user) {
        router.replace('/');
       } 
  });

  return (
    <View >
      <Text >Sign Out</Text>
      <TouchableOpacity onPress={()=>{auth.signOut()}}>
        <Text>Sign Out</Text>
      </TouchableOpacity>
    </View>
  )
}

export default settings

const styles = StyleSheet.create({})