import { useState, useEffect } from 'react'
import Course from '../../classModels/Course'
import user from '../../user'
import Keys from '../../../../common/Keys'

export default function useUserChange(aClass : Course) : boolean {
  const [userIsWatchingClass, setUserIsWatchingClass] = useState(user.isWatchingClass(Keys.getClassHash(aClass)))

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onUserUpdate = () => {
    // Show the notification toggles if the user is watching this class.
    const isWatching = user.isWatchingClass(Keys.getClassHash(aClass));
    if (isWatching !== userIsWatchingClass) {
      setUserIsWatchingClass(isWatching)
    }
  }

  useEffect(() => {
    user.registerUserChangeHandler(onUserUpdate)
    return () => user.unregisterUserChangeHandler(onUserUpdate)
  }, [onUserUpdate])

  return userIsWatchingClass;
}
