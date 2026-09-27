const Task = require('../models/Task');
const List = require('../models/List');

/**
 * Handles task real-time events per spec Sections 5.3 and 5.4.
 *
 * task:moved — drag-and-drop between lists with optimistic-lock version check
 * Payload: { taskId, sourceListId, destListId, newIndex, boardId, clientVersion }
 *
 * Broadcast rules:
 *   - socket.to(boardId)  → everyone EXCEPT sender (Section 5.3)
 *   - socket.emit()       → sender only (for rejection/error feedback)
 */
const registerTaskHandlers = (io, socket) => {
  socket.on('task:moved', async (payload) => {
    const { taskId, sourceListId, destListId, newIndex, boardId, clientVersion } = payload;

    if (!taskId || !sourceListId || !destListId || boardId === undefined) {
      return socket.emit('task:move:failed', { error: 'Invalid payload' });
    }

    try {
      // Optimistic locking: query explicitly by __v to detect stale writes
      const query = { _id: taskId };
      if (clientVersion !== undefined && clientVersion !== null) {
        query.__v = clientVersion;
      }

      const task = await Task.findOne(query);

      if (!task) {
        console.warn(`Stale or invalid move rejected for task ${taskId} (version ${clientVersion})`);
        
        const authoritativeTask = await Task.findById(taskId)
          .populate('assignees', 'name email avatar')
          .populate('createdBy', 'name email avatar');

        return socket.emit('task:move:rejected', {
          taskId,
          authoritativeTask,
          reason: 'STALE_VERSION',
        });
      }

      const isSameList = sourceListId === destListId;

      await List.findByIdAndUpdate(sourceListId, { $pull: { tasks: task._id } });

      if (!isSameList) {
        const destList = await List.findById(destListId);
        if (!destList) {
          return socket.emit('task:move:failed', { error: 'Destination list not found' });
        }

        destList.tasks.splice(newIndex, 0, task._id);
        await destList.save();
      } else {
        const srcList = await List.findById(sourceListId);
        srcList.tasks.splice(newIndex, 0, task._id);
        await srcList.save();
      }

      await Task.findOneAndUpdate(
        query,
        {
          $set: {
            list: destListId,
            position: newIndex * 1000,
          },
          $inc: { __v: 1 },
        },
        { new: true }
      );

      // Excludes sender socket because sender applied move optimistically
      socket.to(boardId).emit('task:moved', {
        taskId,
        sourceListId,
        destListId,
        newIndex,
        boardId,
      });

    } catch (err) {
      console.error('task:moved error:', err);
      socket.emit('task:move:failed', { error: 'Server error during move' });
    }
  });
};

module.exports = registerTaskHandlers;
