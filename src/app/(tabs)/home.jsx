import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { getAuth } from 'firebase/auth'
import { router } from 'expo-router'

const home = () => {
  getAuth().onAuthStateChanged((user) => {
        if (!user) {
          router.replace('/');
        } 
      });

  return (
    <View>
      <Text>home</Text>
    </View>
  )
}

export default home

const styles = StyleSheet.create({})